# 問答題解答

以下解答緊扣本專案實作(Vue 3 + TS + Pinia 前端 / Node + Express + Mongoose 後端 / MongoDB / Zeabur)。
程式碼參照標於各題,皆為本 repo 真實檔案。

---

## 一、實作題第 1 題延伸:三個無父子關係的元件如何「共享同一個零件狀態」?

**做法:用單一狀態容器(Pinia store)作為唯一真實來源(single source of truth)。**

`MeshList`、`MaterialEditor`、`BomSummary` 三者在元件樹上是平行的(共同父層只有 `App`),彼此沒有父子關係。若用 props 往下傳、events 往上拋,會形成「prop drilling + 巨大的父層協調邏輯」,而且第三個兄弟元件還得透過共同祖先轉手,非常脆弱。

我的架構(見 `frontend/src/stores/parts.ts`):

- **狀態集中**:`parts`、`selectedId`、`saveStatus` 都放在 `usePartsStore`。
- **三個元件都只跟 store 互動**:
  - `MeshList` 讀 `store.parts` 渲染、呼叫 `store.selectPart(id)`。
  - `MaterialEditor` 讀 `store.selectedPart`、呼叫 `store.applyLocalUpdate(id, patch)`。
  - `BomSummary` 讀 `store.parts`、`store.grandTotal`(getter)。
- **自動同步**:Pinia 基於 Vue 的 reactivity,任一處改了 `parts`,所有依賴它的 computed / template 會自動重繪。所以在編輯器改 multiplier,清單價格、BOM 小計與總價會「免手動」即時更新。

**為什麼選 store 而不是其他方案:**

| 方案 | 問題 |
|---|---|
| Props/Emits 往返 | 兄弟元件要透過共同祖先轉手,層級一深就是 prop drilling,維護地獄。 |
| `provide / inject` | 適合「祖先注入給後代」,但這裡是平行兄弟,且要可寫、可追蹤變更,inject 一個 ref 仍缺乏動作/除錯能力。 |
| Event Bus(mitt) | 沒有單一真實來源,狀態散落、難追蹤誰改了什麼,大型專案易失控。 |
| **Pinia store** ✅ | 單一來源、reactive 自動同步、actions 可封裝非同步與樂觀更新、devtools 可追蹤,最適合「跨元件共享 + 需持久化」的場景。 |

> React 對應:同樣思路會用 Zustand / Redux Toolkit / Jotai,或 `Context + useReducer`;原則一致——把共享狀態提升到一個獨立、可被任意元件訂閱的容器。

---

## 二、Slider 拖曳觸發耗時計算 / 龐大 BOM 更新時,如何避免瀏覽器卡死?

核心觀念:**把「畫面回饋」和「昂貴工作」解耦**。拖曳要 60fps(每幀約 16ms 預算),但持久化、重算上萬筆 BOM 是昂貴工作,不能每個 `input` 事件都做。

本專案實作(見 `MaterialEditor.vue`、`stores/parts.ts`、`lib/debounce.ts`):

1. **即時更新本地畫面**:slider 每次 `input` 都呼叫 `store.applyLocalUpdate()`,只改記憶體中的值——這是同步、極輕量的操作,畫面瞬間反映,拖曳順手不卡。

2. **昂貴工作 debounce 合併**:真正打 API 持久化由 `createKeyedDebouncer`(預設 300ms)延後。拖曳過程中連發數十次,只有「停下來」後對「該零件」送出 **一次** PATCH,避免請求洪水與後端壓力。

3. **計算保持 cheap**:`grandTotal` 是 Pinia getter,純記憶體加總,parts 變才重算,不阻塞主執行緒。

**若計算真的很重 / BOM 上萬筆,進一步手段:**

- **`requestAnimationFrame` 批次**:把畫面更新對齊到下一個動畫幀,避免一幀內重排多次。
- **Web Worker**:把昂貴計算(大量定價彙總、3D 材質數值換算)丟到 worker 執行緒,主執行緒只負責畫面,徹底避免卡死。
- **虛擬滾動**:BOM 只渲染可視範圍的列(見第五題),DOM 節點數恆定。
- **分離「顯示值」與「提交值」**:拖曳時只動顯示值,放開(`change` / blur)才提交昂貴流程。
- **節流(throttle)**:若要「拖曳中也持續更新」可用 throttle 限制頻率(例如每 50ms 一次)取代 debounce。

---

## 三、數據建模:Mongoose Schema 設計

**實作檔案:`backend/src/models/Part.ts`(以下為精華,完整版見該檔)。**

```ts
const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

const metadataSchema = new Schema(
  {
    material: { type: String, required: true, trim: true },
    weight:   { type: String, required: true, trim: true },
  },
  { _id: false }, // 子文件不需自己的 _id
);

const partSchema = new Schema(
  {
    id:         { type: String, required: true, unique: true, trim: true, index: true },
    name:       { type: String, required: true, trim: true },
    category:   { type: String, required: true, trim: true, index: true },
    color:      { type: String, required: true, uppercase: true,
                  match: [HEX_COLOR, 'color 必須是 #RRGGBB 格式'] },
    basePrice:  { type: Number, required: true, min: 0 },
    multiplier: { type: Number, required: true, default: 1, min: 1, max: 5 },
    metadata:   { type: metadataSchema, required: true },
  },
  { timestamps: true },
);
```

**如何定義型別與必填欄位?**
- 每個欄位明確指定 `type`(`String` / `Number`),核心欄位 `required: true`,避免寫入髒資料。
- 額外用 schema validators 做語意驗證:`color` 用正規表示式限制 `#RRGGBB`;`basePrice >= 0`;`multiplier` 落在 `1.0 ~ 5.0`(對應前端 slider 範圍)。`metadata` 為嵌入子文件,隨主文件一起讀寫,免 join。
- `lineTotal` **不入庫**——它是 `basePrice * multiplier` 的衍生值,以計算取代儲存,避免資料不同步。

**針對 id / category 如何設索引以提升查詢效率?**
- `id` 設 **unique index**:它是業務主鍵(`msh-001`),`findOne({ id })` 走索引是 O(log n);unique 同時防重複。
- `category` 設 **一般 index**:BOM 常以分類過濾/分組(`find({ category })`)。沒有索引時 MongoDB 會做整個 collection 的全表掃描(collection scan),上萬筆時延遲明顯;有索引則只掃描符合的子集。
- 進階:若常以「分類 + 排序」查詢,可建 **複合索引** `{ category: 1, id: 1 }`,讓過濾與排序都吃同一個索引(避免 in-memory sort)。

---

## 四、資料持久化與同步

### (a) 用 Axios 把修改更新回 MongoDB

實作見 `frontend/src/lib/api.ts` 與 `stores/parts.ts` 的 `commit()`:

```ts
// lib/api.ts
async updatePart(id: string, patch: PartUpdate): Promise<Part> {
  const { data } = await http.patch<Part>(`/api/parts/${id}`, patch);
  return data;
}
```

對應後端 `PATCH /api/parts/:id`(`backend/src/controllers/partsController.ts`):只接受白名單欄位、跑 Mongoose validators、回傳更新後文件;查不到回 404、驗證失敗回 400。

### (b) 網路延遲 / 寫入失敗時,如何處理前端 UI?

採 **樂觀更新(Optimistic UI)+ 失敗回滾**,實作於 `stores/parts.ts`:

1. **立即套用本地變更**:使用者一改,三區塊瞬間反映,不等待網路(延遲不影響操作手感)。
2. **背景持久化**(debounce 後送出),並用 `saveStatus` 顯示狀態:`saving`(轉圈)→ `saved`(✓ 已儲存,1.5s 後淡出)→ `error`(⚠ 儲存失敗 + 重試按鈕)。指示元件見 `components/SaveIndicator.vue`。
3. **失敗回滾**:送出前保留 `lastCommitted` 快照;若 API 失敗,將該零件還原成修改前的值,並標記 `error`,使用者可按「重試」重送(`store.retry(id)`)。
4. **以伺服器回傳值為準**:成功後用回應覆蓋本地(例如顏色大小寫正規化、四捨五入),確保前後端一致。

**進一步可加強**:重試退避(exponential backoff)、離線時把變更排入佇列待恢復後重送、PATCH 帶版本號做樂觀鎖避免覆蓋他人變更。

### (c) 即時數據應用:後端推播(SSE)

(a)(b) 是「前端寫、後端存」的方向;IoT 看板則相反——**後端主動把庫存異動推給前端**,展示即時數據應用。

選 **SSE(Server-Sent Events)** 而非輪詢或 WebSocket 的理由:

| 方案 | 取捨 |
|---|---|
| 輪詢 | 實作最簡單,但有延遲、且閒置時也一直打 API,不是真「即時」。 |
| **SSE** ✅ | 後端單向推播,正對應「感測器回報」情境;Node 原生 `res.write` 即可、免額外套件;瀏覽器原生 `EventSource` **自動重連**。 |
| WebSocket | 雙向、功能最全,但這裡只需單向推播;需額外套件、且要自寫重連,過度設計。 |

實作:

1. **後端為真實來源**(`backend/src/lib/iotBus.ts`):模擬器每 1.5 秒隨機挑料件,把庫存異動 **寫入 MongoDB**(`updateOne`),再以進程內 `EventEmitter` pub/sub 廣播。因為落庫,**重整後保留、多分頁同步**。
2. **SSE 端點** `GET /api/parts/stream`(`controllers/streamController.ts`):設 `text/event-stream` 標頭、送 `retry` 與初始 `ready`、訂閱事件以 `data: <json>\n\n` 推出;25s 心跳保活,`req.on('close')` 取消訂閱避免記憶體洩漏。
3. **前端訂閱**(`frontend/src/lib/iotStream.ts`):原生 `EventSource` 接收事件,store 用後端權威 `stock` 覆蓋本地值並推進事件流;連線狀態三態 `live / reconnecting / off`(`EventSource` 斷線會自動重連,無需自寫)。

**進一步可加強**:推播前用 Redis pub/sub 取代進程內 EventEmitter,讓多個後端實例(水平擴展)共享同一事件流;或改用真實感測器資料源取代模擬器。

---

## 五、效能優化:上萬筆資料的分頁 / 虛擬滾動

一次撈回上萬筆並全部渲染,會同時打爆 **網路傳輸**、**記憶體** 與 **DOM 節點數**。對策是後端分頁 + 前端虛擬滾動,兩者搭配。

### 後端(已實作於 `partsController.ts`)

- **伺服器端分頁**:`GET /api/parts?page=&limit=&category=`,用 `skip/limit` 切頁,回 `{ data, total, page, limit }`;`category` 過濾吃索引。每次只傳一頁(如 50 筆)。
- **聚合在 DB 端算總價**:`GET /api/parts/summary` 用 MongoDB aggregation `$sum: { $multiply: [basePrice, multiplier] }` 直接算出 `grandTotal` 與 `count`——**不需要把上萬筆撈到前端再加總**,這是關鍵:前端永遠不必為了顯示「專案總價」而下載全部資料。
- **大量資料更佳作法**:`skip` 在深頁(skip 數十萬)會變慢,改用 **cursor / range-based 分頁**(以 `id > lastId` 配合索引),效能不隨頁數退化;再加 **projection** 只取需要的欄位減少傳輸。

### 前端(虛擬滾動)

- **虛擬滾動(windowing)**:清單/BOM 只渲染「可視範圍 + 緩衝」的列(例如可視 20 列就只有 ~30 個 DOM 節點),捲動時回收複用。可用 `vue-virtual-scroller` 或 `@tanstack/vue-virtual`。DOM 節點數恆定 → 滑動順暢、記憶體穩定。
- **與 store 搭配**:虛擬滾動 + 無限載入——捲到底時呼叫 `fetchParts(nextPage)` 把下一頁併入 `store.parts`,Pinia 仍是唯一來源,元件無需改動。
- **總價顯示**:直接用後端 `/summary` 的結果,不依賴前端是否已載入全部資料。

**總結**:後端分頁/聚合管「不要傳太多、不要在前端算總和」,前端虛擬滾動管「不要渲染太多 DOM」,兩者結合即可在上萬筆規模下維持流暢。
