/**
 * 後端共用型別。前端 frontend/src/types.ts 維持同一份契約。
 */

export interface PartMetadata {
  material: string;
  weight: string;
}

/** 一個模型零件。`id` 是業務主鍵(msh-001),對前端而言就是它的唯一識別。 */
export interface Part {
  id: string;
  name: string;
  category: string;
  /** 16 進位顏色,例如 "#A5A9B4" */
  color: string;
  /** 基礎單價,>= 0 */
  basePrice: number;
  /** 材質複雜度加成,1.0 ~ 5.0 */
  multiplier: number;
  /** 目前庫存量(WMS) */
  stock: number;
  /** 安全庫存水位;stock 低於此值視為需補貨(WMS) */
  safetyStock: number;
  /** 儲位代碼,如 "A-01-03"(WMS) */
  location: string;
  metadata: PartMetadata;
}

/** 分頁清單回應 */
export interface PaginatedParts {
  data: Part[];
  total: number;
  page: number;
  limit: number;
}

/** BOM 總表聚合結果(伺服器端計算,應對上萬筆資料) */
export interface BomSummary {
  grandTotal: number;
  count: number;
  /** 庫存總價值 = Σ(lineTotal × stock)(WMS 看板用) */
  inventoryValue: number;
  /** 庫存量總和 */
  totalStock: number;
  /** 低於安全庫存的料件數 */
  lowStockCount: number;
}

/** PATCH 可更新的欄位(部分更新) */
export type PartUpdate = Partial<
  Pick<
    Part,
    'name' | 'category' | 'color' | 'basePrice' | 'multiplier' | 'stock' | 'safetyStock' | 'location'
  >
>;
