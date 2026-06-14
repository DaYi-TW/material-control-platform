import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import partsRouter from './routes/parts';

/**
 * 建立 Express app(與 server 啟動分離,方便測試與重用)。
 */
export function createApp() {
  const app = express();

  // CORS:從環境變數讀允許的前端來源,逗號分隔;未設定則全部允許(方便本機開發)
  const originsEnv = process.env.FRONTEND_ORIGIN?.trim();
  const corsOptions =
    !originsEnv || originsEnv === '*'
      ? { origin: true }
      : { origin: originsEnv.split(',').map((o) => o.trim()) };
  app.use(cors(corsOptions));

  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/parts', partsRouter);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: { message: 'Not Found' } });
  });

  // 統一錯誤處理
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
    res.status(500).json({ error: { message: '伺服器內部錯誤' } });
  });

  return app;
}
