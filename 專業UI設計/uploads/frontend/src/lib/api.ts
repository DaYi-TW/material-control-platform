/**
 * Axios API client。基底網址由 VITE_API_BASE_URL 提供(本機 / Zeabur 不同)。
 */
import axios from 'axios';
import type { PaginatedParts, Part, PartUpdate, BomSummary } from '../types';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const http = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export const api = {
  async listParts(params: { page?: number; limit?: number; category?: string } = {}): Promise<PaginatedParts> {
    const { data } = await http.get<PaginatedParts>('/api/parts', { params });
    return data;
  },

  async getSummary(): Promise<BomSummary> {
    const { data } = await http.get<BomSummary>('/api/parts/summary');
    return data;
  },

  async getPart(id: string): Promise<Part> {
    const { data } = await http.get<Part>(`/api/parts/${id}`);
    return data;
  },

  /** 部分更新單筆零件 */
  async updatePart(id: string, patch: PartUpdate): Promise<Part> {
    const { data } = await http.patch<Part>(`/api/parts/${id}`, patch);
    return data;
  },
};
