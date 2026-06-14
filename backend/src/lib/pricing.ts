/**
 * 價格計算的「唯一真實來源」。前端 frontend/src/lib/pricing.ts 鏡像同一份邏輯,
 * 確保清單、編輯器、BOM 三處的數字永遠一致。
 *
 * lineTotal  = basePrice * multiplier
 * grandTotal = Σ lineTotal
 *
 * 一律以「數字」運算,顯示時才在 UI 邊界格式化,避免儲存格式化字串造成誤差。
 */

export function lineTotal(basePrice: number, multiplier: number): number {
  return Math.round(basePrice * multiplier * 100) / 100;
}

export function grandTotal(parts: Array<{ basePrice: number; multiplier: number }>): number {
  const sum = parts.reduce((acc, p) => acc + lineTotal(p.basePrice, p.multiplier), 0);
  return Math.round(sum * 100) / 100;
}
