# 智慧製造 · 物料管理平台

一個全端的物料管理平台,前端以頁籤切換兩個檢視,共用同一份後端與狀態層:

- **材質編輯器**:左側「模型零件清單」、右側「材質與屬性編輯器」、下方「BOM 物料總表」三區塊共享同一份零件狀態,在編輯器修改顏色 / 單價 / 加成時,清單與 BOM 即時同步更新。
- **WMS / IoT 看板**:以倉儲視角呈現同一份料件資料——KPI 卡片(總料件數 / 庫存總量 / 庫存總價值 / 低於安全庫存數)、各分類庫存價值長條圖、含安全庫存水位與低庫存警示的庫存明細表,以及模擬 IoT 感測器即時回報庫存異動、看板即時刷新。

| 層 | 技術 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite + Pinia + Axios |
| 後端 | Node.js + Express + TypeScript + Mongoose |
| 資料庫 | MongoDB |
| 部署 | Zeabur(前端、後端、MongoDB 各一個服務) |

> 實作需求與問答題見 [`proposal.md`](./proposal.md);問答題解答見 [`ANSWERS.md`](./ANSWERS.md)。

---

## 專案結構

```
.
├── backend/            Node + Express + Mongoose API
│   └── src/
│       ├── models/Part.ts          Mongoose schema(= 問答題第 3 題解答)
│       ├── controllers/            CRUD + 分頁 + 聚合
│       ├── routes/                 路由
│       ├── lib/pricing.ts          價格計算(與前端同一份邏輯)
│       ├── scripts/seed.ts         匯入種子資料(支援 --bulk=N)
│       ├── data/seed-parts.json    proposal 的 4 筆標準零件
│       ├── app.ts / server.ts      app 與啟動分離
│       └── db.ts                   MongoDB 連線
├── frontend/           Vue 3 + Pinia 前端
│   └── src/
│       ├── stores/parts.ts         單一狀態來源 + 樂觀更新 + debounce
│       ├── components/             MeshList / MaterialEditor / BomSummary / SaveIndicator
│       ├── lib/                    api(axios)/ pricing / debounce
│       └── App.vue                 三區塊版面
├── ANSWERS.md          問答題解答
└── proposal.md         原始考題
```

---

## 本機開發

需求:Node.js ≥ 20、一個可連線的 MongoDB。

最快取得 MongoDB(Docker):

```bash
docker run -d --name me-mongo -p 27017:27017 mongo:7
```

### 1) 後端

```bash
cd backend
npm install
cp .env.example .env        # 確認 MONGODB_URI / PORT / FRONTEND_ORIGIN
npm run seed                # 匯入 4 筆標準零件(可選 --bulk=10000 灌大量資料)
npm run dev                 # http://localhost:4000
```

### 2) 前端

```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:4000
npm run dev                 # http://localhost:5173
```

開啟 http://localhost:5173,點選左側零件、拖動 Multiplier 滑桿,左側價格與下方 BOM 會即時同步。

---

## API

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/parts?page=&limit=&category=` | 分頁清單,回 `{ data, total, page, limit }` |
| GET | `/api/parts/summary` | DB 端聚合,回 `{ grandTotal, count, inventoryValue, totalStock, lowStockCount }`(應對上萬筆) |
| GET | `/api/parts/stream` | **SSE**:後端 IoT 模擬器把庫存異動寫入 DB 並即時推播(`text/event-stream`) |
| GET | `/api/parts/:id` | 取單筆 |
| PATCH | `/api/parts/:id` | 部分更新(color / basePrice / multiplier / name / category) |
| GET | `/health` | 健康檢查 |

錯誤格式統一為 `{ "error": { "message": "..." } }`,搭配 400 / 404 / 500。

`lineTotal = basePrice × multiplier`,`grandTotal = Σ lineTotal`,皆為**計算值不入庫**,前後端共用同一份邏輯(`lib/pricing.ts`)避免不同步。

### IoT 即時數據流(SSE)

「即時數據應用」由**後端**作為真實來源,而非前端假動作:

- 後端 `lib/iotBus.ts` 的模擬器每 1.5 秒隨機挑料件、把庫存異動 **寫入 MongoDB**(`updateOne`),再透過進程內 pub/sub 廣播。
- `GET /api/parts/stream`(`controllers/streamController.ts`)是 SSE 端點:每個瀏覽器連線訂閱事件、以 `data: <json>\n\n` 推播,並有 25s 心跳保活、連線關閉時取消訂閱。
- 前端 `lib/iotStream.ts` 用原生 `EventSource` 訂閱(SSE 原生**自動重連**);store 用後端權威 `stock` 覆蓋本地值。
- 因為來源在後端 / DB:**重整後庫存保留**、**多個分頁同步**。看板狀態燈三態:`LIVE` / `RECONNECT…` / `PAUSED`。

---

## 部署到 Zeabur

在同一個 Git repo 下建立 **三個服務**:

### 1) MongoDB 服務
- 在 Zeabur 專案中新增 **MongoDB**(Marketplace)。
- 它會提供連線 URI(通常透過 `MONGO_CONNECTION_STRING` 或可綁定的變數)。

### 2) 後端服務
- 新增服務 → 指向此 repo,**Root Directory 設為 `backend`**(已有 `zbpack.json` 指定 build/start)。
- 環境變數:
  - `MONGODB_URI` → 綁定上面 MongoDB 服務的連線字串。
  - `PORT` → Zeabur 會注入,程式已讀 `process.env.PORT`。
  - `FRONTEND_ORIGIN` → 前端服務的公開網址(CORS 白名單;開發期可暫設 `*`)。
- 首次部署後執行一次種子(可在本機對 Zeabur 的 MongoDB 連線跑 `npm run seed`,或加一個一次性指令)。

### 3) 前端服務
- 新增服務 → 指向此 repo,**Root Directory 設為 `frontend`**(`zbpack.json` 指定 `output_dir: dist`,以靜態站服務)。
- **Build 時**設環境變數 `VITE_API_BASE_URL` = 後端服務的公開網址(Vite 變數會編譯進產物,務必在 build 前設定)。
- 部署後把前端網址填回後端的 `FRONTEND_ORIGIN`,收斂 CORS。

> 憑證一律走環境變數,不寫死於程式碼。

### SSE 部署注意

`/api/parts/stream` 是長連線 SSE。端點已送 `Cache-Control: no-transform` 與 `X-Accel-Buffering: no` 來關閉反向代理緩衝;Zeabur 代理通常可直接運作。若上線後看板事件「不即時、整批才到」,多半是中介層在 buffer 或連線被提早關閉——屆時確認代理未對該路徑做緩衝即可。CORS 白名單(`FRONTEND_ORIGIN`)需含前端公開網址,`EventSource` 才連得上跨來源端點。
