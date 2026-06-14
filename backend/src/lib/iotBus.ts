/**
 * IoT 事件匯流排 + 模擬器(後端為「即時數據」的真實來源)。
 *
 * 設計:
 * - 一個進程級的 EventEmitter 當作 pub/sub:模擬器是 publisher,每個 SSE 連線是 subscriber。
 * - 模擬器每隔一段時間隨機挑幾個料件,把庫存異動「真的寫進 MongoDB」(findOneAndUpdate),
 *   再把事件廣播給所有訂閱者。因此:資料會持久化、重整後保留、多個分頁同步。
 * - 與前端的差別:庫存的真實來源在後端 / DB,前端只是訂閱與顯示。
 */
import { EventEmitter } from 'events';
import { PartModel } from '../models/Part';

/** 廣播給前端的單筆庫存異動事件 */
export interface IotStockEvent {
  type: 'stock';
  id: string;
  name: string;
  /** 異動量(可正可負) */
  delta: number;
  /** 異動後的庫存量(資料庫權威值) */
  stock: number;
  /** 後端產生事件的時間(ISO 字串,前端格式化為 HH:mm:ss) */
  time: string;
}

const bus = new EventEmitter();
// 一條連線一個 listener;預設上限 10 會在多分頁時誤報 warning,放寬一點。
bus.setMaxListeners(0);

const CHANNEL = 'iot';

export function subscribe(listener: (event: IotStockEvent) => void): () => void {
  bus.on(CHANNEL, listener);
  return () => bus.off(CHANNEL, listener);
}

function publish(event: IotStockEvent): void {
  bus.emit(CHANNEL, event);
}

let timer: NodeJS.Timeout | null = null;

/**
 * 啟動後端 IoT 模擬器。每 intervalMs 挑 1~2 個料件,庫存波動 ±(1~8),
 * 寫回 DB 後廣播事件。回傳停止函式。
 */
export function startIotSimulator(intervalMs = 1500): () => void {
  if (timer) return stopIotSimulator;

  timer = setInterval(() => {
    void tick();
  }, intervalMs);

  // eslint-disable-next-line no-console
  console.log(`[iot] simulator started (every ${intervalMs}ms)`);
  return stopIotSimulator;
}

export function stopIotSimulator(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** tick 只需要這幾個欄位 */
interface PickPart {
  id: string;
  name: string;
  stock: number;
}

async function tick(): Promise<void> {
  try {
    // 只取輕量欄位來挑選目標
    const parts = await PartModel.find().select('id name stock').lean<PickPart[]>();
    if (!parts.length) return;

    const picks = 1 + Math.floor(Math.random() * 2); // 1~2 筆
    for (let k = 0; k < picks; k++) {
      const p = parts[Math.floor(Math.random() * parts.length)];
      const delta = Math.floor(Math.random() * 17) - 8; // -8 ~ +8
      if (delta === 0) continue;

      const prevStock = p.stock ?? 0;
      const nextStock = Math.max(0, prevStock + delta);
      // 真的寫進 DB —— 這就是「後端推」與前端模擬的關鍵差異
      await PartModel.updateOne({ id: p.id }, { $set: { stock: nextStock } });

      publish({
        type: 'stock',
        id: p.id,
        name: p.name,
        delta: nextStock - prevStock,
        stock: nextStock,
        time: new Date().toISOString(),
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[iot] tick error:', err);
  }
}
