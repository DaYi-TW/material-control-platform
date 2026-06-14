import 'dotenv/config';
import { createApp } from './app';
import { connectDB } from './db';
import { startIotSimulator } from './lib/iotBus';

const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

async function main(): Promise<void> {
  if (!MONGODB_URI) {
    throw new Error('缺少環境變數 MONGODB_URI');
  }

  await connectDB(MONGODB_URI);

  const app = createApp();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] API listening on http://localhost:${PORT}`);
  });

  // 後端為 IoT「即時數據」的真實來源:啟動模擬器,庫存異動寫入 DB 並透過 SSE 推播。
  startIotSimulator(1500);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] 啟動失敗:', err);
  process.exit(1);
});
