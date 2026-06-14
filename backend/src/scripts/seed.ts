import 'dotenv/config';
import { connectDB, disconnectDB } from '../db';
import { PartModel } from '../models/Part';
import seedParts from '../data/seed-parts.json';

/**
 * 把 proposal 的標準 4 筆零件寫入 MongoDB。
 *
 * 可選:`npm run seed -- --bulk=10000` 額外灌入大量零件,
 * 用來展示「上萬筆資料」下的分頁 / 伺服器端聚合效能。
 */

const CATEGORIES = ['結構組件', '外部面板', '電子元件', '線材組件', '緊固件'];
const MATERIALS = ['Aluminum 6061', 'Tempered Glass', 'PBT Plastic', 'Steel', 'ABS'];

function randomHex(seed: number): string {
  // 以 index 衍生顏色(可重現,不用亂數)
  const n = ((seed * 2654435761) >>> 0) & 0xffffff;
  return `#${n.toString(16).padStart(6, '0').toUpperCase()}`;
}

function buildBulk(count: number) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const seq = i + 1;
    const stock = (seq * 37) % 500;
    parts.push({
      id: `bulk-${String(seq).padStart(6, '0')}`,
      name: `量產零件 #${seq}`,
      category: CATEGORIES[i % CATEGORIES.length],
      color: randomHex(seq),
      basePrice: 100 + (seq % 50) * 25,
      multiplier: Math.round((1 + (seq % 40) / 10) * 10) / 10, // 1.0~4.9
      stock,
      safetyStock: 100,
      location: `${String.fromCharCode(65 + (i % 5))}-${String((seq % 20) + 1).padStart(2, '0')}-${String((seq % 9) + 1).padStart(2, '0')}`,
      metadata: {
        material: MATERIALS[i % MATERIALS.length],
        weight: `${((seq % 50) / 10 + 0.1).toFixed(1)}kg`,
      },
    });
  }
  return parts;
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('缺少環境變數 MONGODB_URI');

  const bulkArg = process.argv.find((a) => a.startsWith('--bulk='));
  const bulkCount = bulkArg ? parseInt(bulkArg.split('=')[1], 10) || 0 : 0;

  await connectDB(uri);

  await PartModel.deleteMany({});
  await PartModel.insertMany(seedParts);
  // eslint-disable-next-line no-console
  console.log(`[seed] 已寫入 ${seedParts.length} 筆標準零件`);

  if (bulkCount > 0) {
    const bulk = buildBulk(bulkCount);
    await PartModel.insertMany(bulk, { ordered: false });
    // eslint-disable-next-line no-console
    console.log(`[seed] 額外寫入 ${bulkCount} 筆量產零件`);
  }

  await disconnectDB();
  // eslint-disable-next-line no-console
  console.log('[seed] 完成');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] 失敗:', err);
  process.exit(1);
});
