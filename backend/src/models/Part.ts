/**
 * Mongoose Part Schema —— 同時是問答題「數據建模」的解答。
 *
 * 設計重點:
 * 1. 型別與必填:每個欄位都明確指定 type,核心欄位 required: true,避免髒資料。
 * 2. 驗證:color 用正規表示式限制為 #RRGGBB;basePrice >= 0;multiplier 落在 1.0~5.0。
 * 3. 索引:
 *    - id 設 unique index —— 它是業務主鍵(msh-001),查單筆 O(log n)。
 *    - category 設一般 index —— BOM 常以分類過濾/分組,索引避免全表掃描。
 *    （上萬筆資料時,沒有索引的 category 查詢會做 collection scan,延遲明顯。）
 * 4. metadata 為嵌入子文件(material / weight),隨主文件一起讀寫,避免 join。
 * 5. lineTotal 不入庫 —— 它是 basePrice * multiplier 的衍生值,以計算取代儲存避免不同步。
 */

import { Schema, model, InferSchemaType } from 'mongoose';

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

const metadataSchema = new Schema(
  {
    material: { type: String, required: true, trim: true },
    weight: { type: String, required: true, trim: true },
  },
  { _id: false }, // 子文件不需要自己的 _id
);

const partSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    color: {
      type: String,
      required: true,
      uppercase: true,
      match: [HEX_COLOR, 'color 必須是 #RRGGBB 格式的 16 進位色碼'],
    },
    basePrice: {
      type: Number,
      required: true,
      min: [0, 'basePrice 不可為負'],
    },
    multiplier: {
      type: Number,
      required: true,
      default: 1,
      min: [1, 'multiplier 最小為 1.0'],
      max: [5, 'multiplier 最大為 5.0'],
    },
    // --- 倉儲管理(WMS)欄位 ---
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'stock 不可為負'],
    },
    safetyStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'safetyStock 不可為負'],
    },
    /** 儲位代碼,如 "A-01-03"。常用於 WMS 揀貨,建索引便於依儲位查詢 */
    location: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    metadata: { type: metadataSchema, required: true },
  },
  {
    timestamps: true,
    // 對外輸出時隱藏 Mongo 內部欄位,API 只暴露業務 id
    toJSON: {
      virtuals: false,
      versionKey: false,
      transform(_doc, ret) {
        delete (ret as Record<string, unknown>)._id;
        delete (ret as Record<string, unknown>).createdAt;
        delete (ret as Record<string, unknown>).updatedAt;
        return ret;
      },
    },
  },
);

export type PartDoc = InferSchemaType<typeof partSchema>;

export const PartModel = model('Part', partSchema);
