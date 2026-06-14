考題如下:
 
實作題
附圖(上)是一個模型零件清單 (Mesh List)，右側是一個材質編輯器 (Material Editor)，下方有一個BOM 總表 (BOM Summary)，Json檔案中有包含零件ID、名稱、當前材質顏色、價格的json資料。可以自行修改成你覺得更好的UI設計，並請你實作以下需求：
1.	json資料渲染到左側的零件清單與下方的BOM物料總表。
2.	點擊左側清單的某個零件時，右側編輯器要顯示該零件的資訊。
3.	在右側編輯器修改顏色或數值後，左側清單與下方的BOM總表必須及時同步更新。
 
實作資料Json如下
[
  {
    "id": "msh-001",
    "name": "高強度鋁合金支架",
    "category": "結構組件",
    "color": "#A5A9B4",
    "basePrice": 1250,
    "multiplier": 1.2,
    "metadata": { "material": "Aluminum 6061", "weight": "1.5kg" }
  },
  {
    "id": "msh-002",
    "name": "強化玻璃視窗",
    "category": "外部面板",
    "color": "#1E293B",
    "basePrice": 850,
    "multiplier": 1.0,
    "metadata": { "material": "Tempered Glass", "weight": "2.2kg" }
  },
  {
    "id": "msh-003",
    "name": "散熱模組風扇",
    "category": "電子元件",
    "color": "#FF4D4D",
    "basePrice": 450,
    "multiplier": 1.5,
    "metadata": { "material": "PBT Plastic", "weight": "0.3kg" }
  },
  {
    "id": "msh-004",
    "name": "陽極氧化底座",
    "category": "結構組件",
    "color": "#2D3436",
    "basePrice": 2100,
    "multiplier": 2.0,
    "metadata": { "material": "Steel", "weight": "5.0kg" }
  }
]

問答題
1.	在你熟悉的框架中，如果遇到像剛才實作題那樣，三個沒有直接父子關係的元件需要「共享同一個零件狀態」，你會怎麼架構資料流？請描述你的做法
2.	在 SaaS 平台中，我們常遇到拖曳拉桿（Slider）來動態改變 3D 材質數值渲染的需求。如果拉桿的值改變時，要觸發一個耗時的計算或更新一個龐大的 BOM 清單，你會怎麼避免使用者在拖曳時瀏覽器整個卡死？

1. 數據建模請根據上述實作題的 JSON 資料，設計一個 Mongoose Schema (MongoDB)。請考慮到：
•	如何定義資料型別與必填欄位？
•	針對 id 或 category 欄位，你會如何設定索引以提升查詢效率？
2. 資料持久化與同步在實作題中，當使用者在右側編輯器修改數值後：
•	請撰寫一段範例代碼 (使用 Fetch 或 Axios)，模擬如何將修改後的資料透過 API 更新回 MongoDB。
•	如果網路發生延遲或資料庫寫入失敗，你會如何處理前端 UI 的顯示，以確保使用者體驗？
3. 效能優化若 MongoDB 中存有上萬筆零件資料，前端一次性撈取並顯示在 BOM 總表中會造成嚴重效能問題。請問你會如何在前端與後端MongoDB之間實作分頁或虛擬滾動的機制？
