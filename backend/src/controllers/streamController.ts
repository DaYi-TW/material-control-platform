import { Request, Response } from 'express';
import { subscribe } from '../lib/iotBus';

/**
 * GET /api/parts/stream —— Server-Sent Events 端點。
 *
 * 為什麼用 SSE 而非輪詢:庫存異動是「後端單向推給前端」,SSE 用一條長連線推播,
 * 免額外套件、瀏覽器原生 EventSource 會自動重連,正好對應「IoT 感測器回報」情境。
 *
 * 每個 client:
 *  1. 設定 SSE 標頭並立刻 flush(避免被 proxy 緩衝)。
 *  2. 訂閱 iotBus,收到事件就以 `data: <json>\n\n` 推出。
 *  3. 定期送 comment 心跳,維持連線不被中介層砍掉。
 *  4. 連線關閉時取消訂閱、清掉心跳,避免記憶體洩漏。
 */
export function streamParts(req: Request, res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // 關閉 nginx 之類反向代理的緩衝,事件才會即時送達
    'X-Accel-Buffering': 'no',
  });
  // 建議前端的重連間隔(ms)
  res.write('retry: 3000\n\n');
  // 先送一個 ready 事件,讓前端確認連上
  res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const unsubscribe = subscribe((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  // 心跳:每 25 秒送一個 SSE comment(: 開頭),保活
  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}
