/**
 * Parts Store —— 全應用的單一真實狀態來源(問答題第 1 題的答案)。
 *
 * 三個沒有父子關係的元件(MeshList / MaterialEditor / BomSummary)都透過這個 store
 * 讀寫同一份 parts 資料。任何一處修改 → store 變更 → 所有依賴它的元件自動、即時重繪。
 * 不需要 prop drilling 或 event bus。
 *
 * 寫入採「樂觀更新(optimistic update)」(問答題第 4 題):
 *   1. 立即更新本地 state → 三區塊瞬間同步(UI 不等待網路)。
 *   2. 用 keyed debounce 把 API 持久化延後合併(問答題第 2 題:避免 slider 拖曳時洪水請求)。
 *   3. 若 API 失敗 → 回滾到修改前的值,並標記該零件 saveStatus = 'error'。
 */
import { defineStore } from 'pinia';
import type { Part, PartUpdate, SaveStatus } from '../types';
import { api } from '../lib/api';
import { lineTotal, grandTotal } from '../lib/pricing';
import { createKeyedDebouncer } from '../lib/debounce';
import { connectIotStream, type IotStockEvent } from '../lib/iotStream';

interface State {
  parts: Part[];
  selectedId: string | null;
  loading: boolean;
  loadError: string | null;
  saveStatus: Record<string, SaveStatus>;
  /** 每筆零件最後一次「已成功持久化」的快照,失敗時回滾用 */
  lastCommitted: Record<string, PartUpdate>;
  /** SSE 連線狀態('off' = 未連線,'live' = 已連上後端推播,'reconnecting' = 斷線重連中) */
  iotStatus: IotStatus;
  /** IoT 事件流(看板即時 log,最新在前) */
  iotEvents: IotEvent[];
}

export type IotStatus = 'off' | 'live' | 'reconnecting';

/** 單筆 IoT 庫存異動事件(供 UI 顯示) */
export interface IotEvent {
  time: string;
  name: string;
  delta: number;
}

/** 把後端 ISO 時間轉成 HH:mm:ss */
function isoToHms(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const usePartsStore = defineStore('parts', {
  state: (): State => ({
    parts: [],
    selectedId: null,
    loading: false,
    loadError: null,
    saveStatus: {},
    lastCommitted: {},
    iotStatus: 'off',
    iotEvents: [],
  }),

  getters: {
    selectedPart(state): Part | null {
      return state.parts.find((p) => p.id === state.selectedId) ?? null;
    },
    /** grandTotal 是 cheap 的 computed getter,parts 一變就重算,不阻塞拖曳 */
    grandTotal(state): number {
      return grandTotal(state.parts);
    },
    lineTotalOf() {
      return (part: Part): number => lineTotal(part.basePrice, part.multiplier);
    },
    statusOf(state) {
      return (id: string): SaveStatus => state.saveStatus[id] ?? 'idle';
    },

    // --- WMS / IoT 看板用 getters(皆為 cheap 的記憶體計算)---

    /** 庫存總價值 = Σ(lineTotal × stock) */
    inventoryValue(state): number {
      return state.parts.reduce(
        (acc, p) => acc + lineTotal(p.basePrice, p.multiplier) * p.stock,
        0,
      );
    },
    totalStock(state): number {
      return state.parts.reduce((acc, p) => acc + p.stock, 0);
    },
    /** 低於安全庫存的料件(需補貨) */
    lowStockParts(state): Part[] {
      return state.parts.filter((p) => p.stock < p.safetyStock);
    },
    /** 各分類彙總:件數、庫存價值(看板長條圖用) */
    categoryBreakdown(state): Array<{ category: string; count: number; value: number }> {
      const map = new Map<string, { count: number; value: number }>();
      for (const p of state.parts) {
        const cur = map.get(p.category) ?? { count: 0, value: 0 };
        cur.count += 1;
        cur.value += lineTotal(p.basePrice, p.multiplier) * p.stock;
        map.set(p.category, cur);
      }
      return [...map.entries()]
        .map(([category, v]) => ({ category, ...v }))
        .sort((a, b) => b.value - a.value);
    },
  },

  actions: {
    async fetchParts(): Promise<void> {
      this.loading = true;
      this.loadError = null;
      try {
        // 拿較大的 limit 取回首頁資料;上萬筆時改用分頁 / 虛擬滾動(見 ANSWERS.md 第 5 題)
        const res = await api.listParts({ page: 1, limit: 200 });
        this.parts = res.data;
        if (!this.selectedId && this.parts.length) {
          this.selectedId = this.parts[0].id;
        }
      } catch (err) {
        this.loadError = err instanceof Error ? err.message : '載入失敗';
      } finally {
        this.loading = false;
      }
    },

    selectPart(id: string): void {
      this.selectedId = id;
    },

    /**
     * 本地即時套用更新(同步,不打 API)。三區塊立刻反映。
     * 接著排程 debounced 持久化。
     */
    applyLocalUpdate(id: string, patch: PartUpdate): void {
      const idx = this.parts.findIndex((p) => p.id === id);
      if (idx === -1) return;
      // 保留修改前快照(若尚未有 committed 紀錄)
      if (!this.lastCommitted[id]) {
        const cur = this.parts[idx];
        this.lastCommitted[id] = {
          name: cur.name,
          category: cur.category,
          color: cur.color,
          basePrice: cur.basePrice,
          multiplier: cur.multiplier,
          stock: cur.stock,
          safetyStock: cur.safetyStock,
          location: cur.location,
        };
      }
      this.parts[idx] = { ...this.parts[idx], ...patch };
      persist.trigger(id);
    },

    /** 真正把目前本地值送回後端;失敗則回滾 */
    async commit(id: string): Promise<void> {
      const part = this.parts.find((p) => p.id === id);
      if (!part) return;

      const before = this.lastCommitted[id];
      const patch: PartUpdate = {
        name: part.name,
        category: part.category,
        color: part.color,
        basePrice: part.basePrice,
        multiplier: part.multiplier,
        stock: part.stock,
        safetyStock: part.safetyStock,
        location: part.location,
      };

      this.saveStatus[id] = 'saving';
      try {
        const saved = await api.updatePart(id, patch);
        // 用伺服器回傳的權威值覆蓋(顏色大小寫、四捨五入等)
        const idx = this.parts.findIndex((p) => p.id === id);
        if (idx !== -1) this.parts[idx] = saved;
        this.saveStatus[id] = 'saved';
        delete this.lastCommitted[id];
        // 1.5 秒後把 'saved' 指示淡回 idle
        setTimeout(() => {
          if (this.saveStatus[id] === 'saved') this.saveStatus[id] = 'idle';
        }, 1500);
      } catch {
        // 失敗 → 回滾到修改前的值
        if (before) {
          const idx = this.parts.findIndex((p) => p.id === id);
          if (idx !== -1) this.parts[idx] = { ...this.parts[idx], ...before };
        }
        this.saveStatus[id] = 'error';
      }
    },

    /** 失敗後手動重試:把目前本地值再送一次 */
    async retry(id: string): Promise<void> {
      await this.commit(id);
    },

    /**
     * 套用一筆後端推來的 IoT 庫存異動事件:
     * 用 DB 的權威庫存值覆蓋本地對應料件,並把事件加入事件流。
     * 庫存的真實來源在後端 / DB,前端只是訂閱與顯示(這就是「後端推」)。
     */
    applyIotEvent(event: IotStockEvent): void {
      const idx = this.parts.findIndex((p) => p.id === event.id);
      if (idx !== -1) {
        this.parts[idx] = { ...this.parts[idx], stock: event.stock };
      }
      this.iotEvents.unshift({ time: isoToHms(event.time), name: event.name, delta: event.delta });
      this.iotEvents = this.iotEvents.slice(0, 6);
    },

    /**
     * 連上後端 SSE 串流,訂閱即時庫存異動。回傳關閉函式。
     * EventSource 斷線會自動重連,因此這裡不需自寫重連邏輯。
     */
    connectIot(): () => void {
      if (iotClose) return iotClose;
      iotClose = connectIotStream({
        onOpen: () => {
          this.iotStatus = 'live';
        },
        onEvent: (event) => this.applyIotEvent(event),
        onError: () => {
          // EventSource 會自動重連;期間標示為 reconnecting
          this.iotStatus = 'reconnecting';
        },
      });
      return iotClose;
    },

    disconnectIot(): void {
      if (iotClose) {
        iotClose();
        iotClose = null;
      }
      this.iotStatus = 'off';
    },
  },
});

/**
 * SSE 關閉函式存在模組層級(非響應式,且整個 app 只有一個 parts store),
 * 與下方的 keyed debouncer 同理,避免放進 Pinia state。
 */
let iotClose: (() => void) | null = null;

/**
 * 模組層級的單例 keyed debouncer。
 * 同一零件停止操作 ~300ms 後才真正打 API(slider 拖曳期間不會洪水請求)。
 * 放在 store 外,避免污染 Pinia actions(actions 應只含函式)。
 */
const persist = createKeyedDebouncer((id: string) => {
  void usePartsStore().commit(id);
}, 300);
