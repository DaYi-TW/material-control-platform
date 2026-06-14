# 技術架構 · 物料管理平台

這份文件講**資料怎麼流動、系統怎麼分層、一次操作的完整生命週期**。
功能操作見 [`GUIDE.md`](./GUIDE.md);設計決策的取捨見 [`README.md`](./README.md) 與 [`ANSWERS.md`](./ANSWERS.md)。

---

## 1. 系統分層

```mermaid
flowchart TB
  subgraph FE["瀏覽器 · Vue 3 + TypeScript"]
    App["App.vue<br/>側欄導覽 / 雙主題 shell"]
    Views["MaterialEditorView<br/>(MeshList / MaterialEditor / BomSummary)<br/>+ WarehouseDashboard"]
    Store["stores/parts.ts · Pinia<br/>狀態唯一真實來源"]
    Api["lib/api.ts · axios"]
    Stream["lib/iotStream.ts · EventSource"]
    App --> Views --> Store
    Store --> Api
    Stream --> Store
  end

  subgraph BE["後端 · Node + Express + TypeScript"]
    Routes["routes/parts.ts"]
    Ctrl["controllers/partsController<br/>CRUD / 分頁 / 聚合"]
    SctrlSSE["controllers/streamController<br/>SSE 端點"]
    Model["models/Part.ts · Mongoose"]
    Bus["lib/iotBus.ts<br/>模擬器 + pub/sub"]
    Routes --> Ctrl --> Model
    Routes --> SctrlSSE
    Bus --> SctrlSSE
    Bus -. updateOne .-> Model
  end

  DB[("MongoDB · parts<br/>index: id(unique) / category")]

  Api -- "REST (JSON)" --> Routes
  SctrlSSE -- "SSE (text/event-stream)" --> Stream
  Model --> DB
```

**前後端共用一份計價邏輯**:`lib/pricing.ts` 在前後端各有一份鏡像(`lineTotal = basePrice × multiplier`),確保清單 / 編輯器 / BOM / 後端聚合的數字永遠一致。`lineTotal` 為計算值,**不入庫**。

---

## 2. 前端狀態:單一真實來源

三個沒有父子關係的元件(`MeshList` / `MaterialEditor` / `BomSummary`)不靠 props/events 溝通,而是**都訂閱同一個 Pinia store**。

```mermaid
flowchart TB
  Store["stores/parts.ts · Pinia<br/><br/>state: parts[] / selectedId / saveStatus / iotEvents<br/>getters: selectedPart / grandTotal / inventoryValue / categoryBreakdown<br/>actions: applyLocalUpdate / commit / connectIot / applyIotEvent"]
  Mesh["MeshList"]
  Editor["MaterialEditor"]
  Bom["BomSummary"]
  Mesh -- "讀 + 寫" --> Store
  Editor -- "讀 + 寫" --> Store
  Bom -- "讀" --> Store
```

任一處改了 `parts`,所有依賴它的 getter / template 因 Vue reactivity **自動重繪** —— 編輯器改 multiplier,清單價格與 BOM 總價免手動同步。詳見 [ANSWERS 第一題](./ANSWERS.md)。

---

## 3. 一次編輯的完整生命週期(寫入路徑)

以「拖動 Multiplier 滑桿」為例,展示**樂觀更新 + keyed debounce + 失敗回滾**如何協作:

```mermaid
flowchart TD
  Drag["使用者拖滑桿<br/>連續觸發數十次 input"]
  Local["① applyLocalUpdate(id, patch) · 同步輕量<br/>首次變更前存 lastCommitted 快照(回滾用)<br/>直接改 store.parts[i] → 三區塊立即重繪(不等網路)"]
  Debounce["② persist.trigger(id) · keyed debounce 300ms<br/>拖曳期間每次重設計時器<br/>停下 ~300ms 後對該零件觸發一次"]
  Commit["③ commit(id) · 打 API<br/>saveStatus = saving(轉圈)"]
  OK["成功:用伺服器回傳值覆蓋本地<br/>(顏色大小寫 / 四捨五入正規化)<br/>saveStatus = saved ✓(1.5s 後淡出)<br/>清掉 lastCommitted"]
  Fail["失敗:用 lastCommitted 還原該零件<br/>saveStatus = error ⚠<br/>顯示重試按鈕 → retry(id) 重送"]

  Drag --> Local --> Debounce --> Commit
  Commit -->|PATCH 200| OK
  Commit -->|錯誤| Fail
```

**為什麼這樣設計**:把「畫面回饋(同步、即時)」和「持久化(非同步、昂貴)」解耦——拖曳維持 60fps、不送洪水請求;網路延遲不影響手感;失敗也不留假資料。詳見 [ANSWERS 第二題](./ANSWERS.md) 與 [第四題](./ANSWERS.md)。

> 關鍵檔案:`MaterialEditor.vue`(觸發)→ `stores/parts.ts`(`applyLocalUpdate` / `commit`)→ `lib/debounce.ts`(keyed debounce)→ `lib/api.ts`(axios PATCH)。

---

## 4. 讀取路徑(初次載入 / 重新載入)

```mermaid
sequenceDiagram
  participant App as App.vue
  participant Store as parts store
  participant Api as lib/api.ts
  participant Ctrl as partsController
  participant DB as MongoDB
  App->>Store: onMounted → fetchParts()
  Store->>Api: listParts({ page:1, limit:200 })
  Api->>Ctrl: GET /api/parts?page=1&limit=200
  Ctrl->>DB: find().skip().limit().lean()  (吃 category 索引)
  Ctrl->>DB: countDocuments()
  DB-->>Ctrl: docs + total
  Ctrl-->>Api: { data, total, page, limit }
  Api-->>Store: parts 資料
  Store->>Store: 存入 store.parts,預設選第一筆
```

**總價不靠前端加總**:`GET /api/parts/summary` 用 MongoDB aggregation(`$sum: { $multiply: [basePrice, multiplier] }`)在 **DB 端**算出 grandTotal / inventoryValue / lowStockCount——上萬筆時前端也不需下載全部資料來顯示總和。詳見 [ANSWERS 第五題](./ANSWERS.md)。

---

## 5. 即時數據:SSE 推播路徑

IoT 看板的庫存異動由**後端主動推播**,前端被動訂閱。這是與「前端寫、後端存」相反的方向。

```mermaid
sequenceDiagram
  participant Bus as lib/iotBus.ts
  participant DB as MongoDB
  participant SSE as streamController<br/>GET /api/parts/stream
  participant ES as lib/iotStream.ts<br/>EventSource
  participant Store as parts store
  participant Dash as WarehouseDashboard

  Note over SSE,ES: 連線建立:設 text/event-stream + 關 proxy 緩衝<br/>送 retry + ready,25s 心跳保活
  loop 每 1.5s 一個 tick
    Bus->>Bus: 隨機挑 1~2 個料件
    Bus->>DB: updateOne(...) 寫進 DB(故重整保留 / 多分頁同步)
    Bus->>SSE: emit iot event 進程內廣播
    SSE->>ES: res.write data 行(SSE)
    ES->>Store: applyIotEvent(event)
    Store->>Store: 用後端權威 stock 覆蓋本地 + 推進 iotEvents
    Store->>Dash: KPI / 長條圖 / 事件流 / 庫存表即時重繪
  end
  Note over ES: 斷線時 EventSource 自動重連(狀態燈 reconnecting)
```

**為什麼是 SSE 而非輪詢 / WebSocket**:單向推播正對應「感測器回報」;Node 原生 `res.write` 免套件;`EventSource` 原生自動重連。詳見 [ANSWERS 第四題 (c)](./ANSWERS.md)。

---

## 6. 資料模型(MongoDB / Mongoose)

`backend/src/models/Part.ts` 的 `Part` schema 同時是問答題「數據建模」的解答:

| 欄位 | 型別 / 驗證 | 備註 |
|---|---|---|
| `id` | String, **required, unique, index** | 業務主鍵(`msh-001`),查單筆 O(log n) |
| `name` | String, required | |
| `category` | String, required, **index** | BOM 常以分類過濾 / 分組,索引避免全表掃描 |
| `color` | String, required, `match #RRGGBB` | uppercase 正規化 |
| `basePrice` | Number, required, `min 0` | |
| `multiplier` | Number, required, `min 1, max 5` | 對應前端 slider 範圍 |
| `stock` / `safetyStock` | Number, required | WMS 庫存與安全水位 |
| `location` | String, required, index | 儲位代碼 |
| `metadata` | 嵌入子文件 `{ material, weight }` | `_id: false`,隨主文件讀寫免 join |

`lineTotal` 不入庫(計算值)。詳見 [ANSWERS 第三題](./ANSWERS.md)。

---

## 7. API 一覽

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/parts?page=&limit=&category=` | 分頁清單 `{ data, total, page, limit }` |
| GET | `/api/parts/summary` | DB 端聚合 `{ grandTotal, count, inventoryValue, totalStock, lowStockCount }` |
| GET | `/api/parts/stream` | **SSE** 庫存異動推播 |
| GET | `/api/parts/:id` | 取單筆 |
| PATCH | `/api/parts/:id` | 部分更新(白名單欄位 + Mongoose validators) |
| GET | `/health` | 健康檢查 |

錯誤統一 `{ "error": { "message": "..." } }`,搭配 400 / 404 / 500。

> 路由順序注意:`/summary` 與 `/stream` 必須排在 `/:id` 之前,否則會被當成 `id="summary"/"stream"` 攔截。

---

## 8. 部署拓樸(Zeabur)

```mermaid
flowchart LR
  Browser["瀏覽器"]
  subgraph Z["Zeabur project · material-platform(同一 environment)"]
    FE["frontend<br/>nginx 靜態,聽 $PORT"]
    BE["backend<br/>Node + Express,聽 $PORT"]
    Mongo["mongodb<br/>Marketplace<br/>exposed: MONGO_CONNECTION_STRING"]
    BE -- "MONGODB_URI 綁定" --> Mongo
  end
  Browser -- "靜態頁" --> FE
  Browser -- "REST + SSE(公開網域)" --> BE
```

- 前端 `VITE_API_BASE_URL` 在 **build 時**烤進產物(瀏覽器直接打後端公開網域)。
- 後端 `MONGODB_URI` 用 `${MONGO_CONNECTION_STRING}/material_editor?authSource=admin` 綁定 mongodb 服務。
- 三服務同一 environment;CORS 由後端 `FRONTEND_ORIGIN` 收斂到前端網域。

實際部署流程與踩雷解法見 [README 部署段](./README.md)。
