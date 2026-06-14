import mongoose from 'mongoose';

/**
 * 建立 MongoDB 連線。連線字串一律從環境變數讀取,不寫死憑證。
 */
export async function connectDB(uri: string): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  // eslint-disable-next-line no-console
  console.log('[db] MongoDB connected');
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
