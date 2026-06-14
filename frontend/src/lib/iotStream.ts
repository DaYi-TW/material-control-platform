/**
 * IoT SSE 連線封裝。後端 GET /api/parts/stream 以 Server-Sent Events 持續推播庫存異動;
 * 這裡用瀏覽器原生 EventSource 訂閱(原生支援斷線自動重連)。
 *
 * 為什麼不用 axios:axios 沒有串流 / 自動重連;EventSource 正是為 SSE 設計的。
 */

/** 與後端 IotStockEvent 對應 */
export interface IotStockEvent {
  type: 'stock';
  id: string;
  name: string;
  delta: number;
  stock: number;
  time: string; // ISO
}

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface IotStreamHandlers {
  onEvent: (event: IotStockEvent) => void;
  onOpen?: () => void;
  onError?: () => void;
}

/**
 * 建立 SSE 連線。回傳關閉函式。
 * EventSource 在連線中斷時會依後端的 `retry:` 自動重連,毋需自己寫重連邏輯。
 */
export function connectIotStream(handlers: IotStreamHandlers): () => void {
  const es = new EventSource(`${baseURL}/api/parts/stream`);

  es.onopen = () => handlers.onOpen?.();

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as IotStockEvent;
      if (data?.type === 'stock') handlers.onEvent(data);
    } catch {
      // 忽略心跳 / 非 JSON 訊息
    }
  };

  es.onerror = () => handlers.onError?.();

  return () => es.close();
}
