import { Request, Response, NextFunction } from 'express';
import { PartModel } from '../models/Part';
import { grandTotal } from '../lib/pricing';
import type { PartUpdate } from '../types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** 用 .lean() 查詢會跳過 schema 的 toJSON transform,故這裡統一只挑出 API 對外欄位 */
const API_PROJECTION =
  '-_id id name category color basePrice multiplier stock safetyStock location metadata';

function toApi(doc: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!doc) return null;
  const { _id, __v, createdAt, updatedAt, ...rest } = doc as Record<string, unknown> & {
    metadata?: { _id?: unknown };
  };
  void _id;
  void __v;
  void createdAt;
  void updatedAt;
  return rest;
}

/** 只允許更新這些欄位,避免使用者竄改 id 等主鍵 */
const UPDATABLE_FIELDS: Array<keyof PartUpdate> = [
  'name',
  'category',
  'color',
  'basePrice',
  'multiplier',
  'stock',
  'safetyStock',
  'location',
];

/**
 * GET /api/parts?page=1&limit=50&category=結構組件
 * 伺服器端分頁。回應 { data, total, page, limit }。
 * 上萬筆資料時不會一次撈回全部 —— 由 skip/limit 切頁,搭配 category 索引過濾。
 */
export async function listParts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limitRaw = parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
    const limit = Math.min(MAX_LIMIT, Math.max(1, limitRaw));
    const category = typeof req.query.category === 'string' && req.query.category.trim()
      ? req.query.category.trim()
      : undefined;

    const filter = category ? { category } : {};

    const [data, total] = await Promise.all([
      PartModel.find(filter)
        .select(API_PROJECTION)
        .sort({ id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PartModel.countDocuments(filter),
    ]);

    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parts/summary
 * 伺服器端聚合算出 BOM 總價與筆數。
 * 即使有上萬筆,也不需要把全部資料傳到前端再加總 —— 用 aggregation 在 DB 端算。
 */
export async function getSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [agg] = await PartModel.aggregate([
      {
        $group: {
          _id: null,
          grandTotal: { $sum: { $multiply: ['$basePrice', '$multiplier'] } },
          count: { $sum: 1 },
          // 庫存總價值 = Σ(單價 × 加成 × 庫存量)
          inventoryValue: {
            $sum: { $multiply: ['$basePrice', '$multiplier', '$stock'] },
          },
          totalStock: { $sum: '$stock' },
          // 低於安全庫存的料件數
          lowStockCount: {
            $sum: { $cond: [{ $lt: ['$stock', '$safetyStock'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          grandTotal: 1,
          count: 1,
          inventoryValue: 1,
          totalStock: 1,
          lowStockCount: 1,
        },
      },
    ]);

    res.json(
      agg ?? { grandTotal: 0, count: 0, inventoryValue: 0, totalStock: 0, lowStockCount: 0 },
    );
  } catch (err) {
    next(err);
  }
}

/** GET /api/parts/:id */
export async function getPart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const part = await PartModel.findOne({ id: req.params.id }).select(API_PROJECTION).lean();
    if (!part) {
      res.status(404).json({ error: { message: `找不到零件 ${req.params.id}` } });
      return;
    }
    res.json(part);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/parts/:id
 * 部分更新。只接受白名單欄位,跑 Mongoose 驗證(schema validators),回傳更新後的文件。
 */
export async function updatePart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};

    for (const field of UPDATABLE_FIELDS) {
      if (body[field] !== undefined) update[field] = body[field];
    }

    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: { message: '沒有可更新的欄位' } });
      return;
    }

    const part = await PartModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { new: true, runValidators: true },
    )
      .select(API_PROJECTION)
      .lean();

    if (!part) {
      res.status(404).json({ error: { message: `找不到零件 ${req.params.id}` } });
      return;
    }

    res.json(toApi(part));
  } catch (err) {
    // Mongoose 驗證錯誤 → 400
    if (err instanceof Error && err.name === 'ValidationError') {
      res.status(400).json({ error: { message: err.message } });
      return;
    }
    next(err);
  }
}

// grandTotal 工具供需要時於記憶體聚合使用(小資料量場景),目前 summary 走 DB aggregation。
export { grandTotal };
