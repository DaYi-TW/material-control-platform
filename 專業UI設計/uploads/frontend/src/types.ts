/** 前端型別契約,與後端 backend/src/types.ts 保持一致。 */

export interface PartMetadata {
  material: string;
  weight: string;
}

export interface Part {
  id: string;
  name: string;
  category: string;
  color: string;
  basePrice: number;
  multiplier: number;
  /** 目前庫存量(WMS) */
  stock: number;
  /** 安全庫存水位(WMS) */
  safetyStock: number;
  /** 儲位代碼,如 "A-01-03"(WMS) */
  location: string;
  metadata: PartMetadata;
}

export interface PaginatedParts {
  data: Part[];
  total: number;
  page: number;
  limit: number;
}

export interface BomSummary {
  grandTotal: number;
  count: number;
  inventoryValue: number;
  totalStock: number;
  lowStockCount: number;
}

export type PartUpdate = Partial<
  Pick<
    Part,
    'name' | 'category' | 'color' | 'basePrice' | 'multiplier' | 'stock' | 'safetyStock' | 'location'
  >
>;

/** 樂觀更新時,每筆零件的儲存狀態(用於 UI 顯示 saving/saved/error) */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
