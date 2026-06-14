/**
 * 價格計算 —— 鏡像後端 backend/src/lib/pricing.ts 的同一份邏輯。
 * 三個區塊(清單/編輯器/BOM)都呼叫這裡,確保數字永遠一致。
 */

import type { Part } from '../types';

export function lineTotal(basePrice: number, multiplier: number): number {
  return Math.round(basePrice * multiplier * 100) / 100;
}

export function grandTotal(parts: Part[]): number {
  const sum = parts.reduce((acc, p) => acc + lineTotal(p.basePrice, p.multiplier), 0);
  return Math.round(sum * 100) / 100;
}

/** 顯示用的金額格式化(僅在 UI 邊界使用,不影響儲存值) */
export function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}
