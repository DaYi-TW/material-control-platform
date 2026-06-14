<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { usePartsStore } from '../stores/parts';
import { formatCurrency, lineTotal } from '../lib/pricing';

const store = usePartsStore();

// IoT 即時數據流由後端透過 SSE 推播:進入看板時連線,離開時關閉。
const iotOn = computed(() => store.iotStatus !== 'off');
onMounted(() => store.connectIot());
onUnmounted(() => store.disconnectIot());

function toggleIot() {
  if (store.iotStatus === 'off') store.connectIot();
  else store.disconnectIot();
}

const statusText = computed(() => {
  if (store.iotStatus === 'live') return 'LIVE';
  if (store.iotStatus === 'reconnecting') return 'RECONNECT…';
  return 'PAUSED';
});

const maxCatValue = computed(() =>
  Math.max(1, ...store.categoryBreakdown.map((c) => c.value)),
);

function stockRatio(stock: number, safety: number): number {
  if (safety <= 0) return 1;
  return Math.min(1, stock / (safety * 2)); // 安全庫存的兩倍視為「滿」
}
</script>

<template>
  <div class="dash">
    <!-- KPI 卡片列 -->
    <div class="kpis">
      <div class="kpi panel">
        <div class="kpi-label">總料件數</div>
        <div class="kpi-value mono">{{ store.parts.length }}</div>
        <div class="kpi-foot">SKU 種類</div>
      </div>
      <div class="kpi panel">
        <div class="kpi-label">庫存總量</div>
        <div class="kpi-value mono">{{ store.totalStock.toLocaleString() }}</div>
        <div class="kpi-foot">件 · 即時刷新</div>
      </div>
      <div class="kpi panel">
        <div class="kpi-label">庫存總價值</div>
        <div class="kpi-value mono accent">{{ formatCurrency(store.inventoryValue) }}</div>
        <div class="kpi-foot">單價 × 加成 × 庫存</div>
      </div>
      <div class="kpi panel" :class="{ alert: store.lowStockParts.length > 0 }">
        <div class="kpi-label">低於安全庫存</div>
        <div class="kpi-value mono" :class="{ danger: store.lowStockParts.length > 0 }">
          {{ store.lowStockParts.length }}
        </div>
        <div class="kpi-foot">項需補貨</div>
      </div>
    </div>

    <div class="grid">
      <!-- 分類庫存價值長條圖 -->
      <section class="panel">
        <div class="panel-head">
          <span class="panel-title">各分類庫存價值佔比</span>
          <span class="mono head-tag">BY CATEGORY</span>
        </div>
        <div class="bars">
          <div v-for="c in store.categoryBreakdown" :key="c.category" class="bar-row">
            <span class="bar-label">{{ c.category }}</span>
            <span class="bar-track">
              <span class="bar-fill" :style="{ width: (c.value / maxCatValue) * 100 + '%' }" />
            </span>
            <span class="bar-value mono">{{ formatCurrency(c.value) }}</span>
          </div>
        </div>
      </section>

      <!-- IoT 即時數據流 -->
      <section class="panel iot">
        <div class="panel-head">
          <span class="live-dot" :class="store.iotStatus" />
          <span class="panel-title">IoT 即時數據流</span>
          <span class="mono iot-status" :class="store.iotStatus">{{ statusText }}</span>
        </div>
        <div class="iot-body">
          <p class="iot-desc">
            後端感測器每 1.5 秒回報庫存異動、寫入資料庫,並透過 SSE 推播;看板 KPI、圖表與明細即時刷新(多個分頁會同步)。
          </p>
          <button class="iot-toggle" @click="toggleIot">
            <svg v-if="iotOn" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 5l12 7-12 7V5Z" />
            </svg>
            {{ iotOn ? '暫停資料流' : '啟動資料流' }}
          </button>
          <div class="event-log">
            <div class="event-log-title">事件流 · EVENT LOG</div>
            <div
              v-for="(ev, i) in store.iotEvents"
              :key="i"
              class="event-row mono"
            >
              <span class="ev-time muted">{{ ev.time }}</span>
              <span class="ev-name">{{ ev.name }}</span>
              <span class="ev-delta" :class="ev.delta > 0 ? 'up' : 'down'">
                {{ ev.delta > 0 ? '+' : '' }}{{ ev.delta }}
              </span>
            </div>
            <div v-if="!store.iotEvents.length" class="event-empty muted">等待感測器回報…</div>
          </div>
        </div>
      </section>
    </div>

    <!-- 庫存明細表 -->
    <section class="panel">
      <div class="panel-head">
        <span class="panel-title">庫存明細 · INVENTORY</span>
        <span class="mono head-tag">{{ store.parts.length }} 項</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>料件</th>
            <th>儲位</th>
            <th class="num">庫存量</th>
            <th class="level-col">水位</th>
            <th class="num">安全庫存</th>
            <th class="num">庫存價值</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in store.parts" :key="p.id" :class="{ low: p.stock < p.safetyStock }">
            <td>
              <span class="item-cell">
                <span class="swatch" :style="{ background: p.color }" />
                <span class="item-name">{{ p.name }}</span>
                <span class="item-cat muted">{{ p.category }}</span>
              </span>
            </td>
            <td class="mono muted loc">{{ p.location }}</td>
            <td class="num mono stock-num" :class="{ danger: p.stock < p.safetyStock }">
              {{ p.stock }}
            </td>
            <td>
              <span class="level-track">
                <span
                  class="level-fill"
                  :class="{ danger: p.stock < p.safetyStock }"
                  :style="{ width: stockRatio(p.stock, p.safetyStock) * 100 + '%' }"
                />
              </span>
            </td>
            <td class="num mono muted">{{ p.safetyStock }}</td>
            <td class="num mono value-num">
              {{ formatCurrency(lineTotal(p.basePrice, p.multiplier) * p.stock) }}
            </td>
            <td>
              <span class="tag" :class="p.stock < p.safetyStock ? 'danger' : 'ok'">
                {{ p.stock < p.safetyStock ? '需補貨' : '正常' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.dash {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1240px;
}
.head-tag {
  font-size: 11px;
  color: var(--text-3);
}

/* ---- KPI ---- */
.kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.kpi {
  padding: 14px 16px;
}
.kpi.alert {
  border-color: var(--danger);
}
.kpi-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.11em;
  color: var(--text-3);
}
.kpi-value {
  font-size: 27px;
  font-weight: 600;
  margin-top: 7px;
  letter-spacing: -0.01em;
}
.kpi-value.accent {
  color: var(--accent);
}
.kpi-value.danger {
  color: var(--danger);
}
.kpi-foot {
  font-size: 10.5px;
  color: var(--text-3);
  margin-top: 3px;
}

/* ---- grid ---- */
.grid {
  display: grid;
  grid-template-columns: 1.7fr 1fr;
  gap: 14px;
  align-items: start;
}

/* ---- bars ---- */
.bars {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 13px;
}
.bar-row {
  display: grid;
  grid-template-columns: 78px 1fr auto;
  align-items: center;
  gap: 12px;
}
.bar-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
}
.bar-track {
  height: 9px;
  background: var(--track);
  border-radius: 5px;
  overflow: hidden;
}
.bar-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 5px;
  transition: width 0.5s ease;
}
.bar-value {
  font-size: 12px;
  min-width: 74px;
  text-align: right;
  color: var(--text);
}

/* ---- IoT ---- */
.iot {
  display: flex;
  flex-direction: column;
}
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--text-3);
}
.live-dot.live {
  background: var(--ok);
  animation: blink 1.6s ease-in-out infinite;
}
.live-dot.reconnecting {
  background: var(--accent);
  animation: blink 0.8s ease-in-out infinite;
}
.iot-status {
  margin-left: auto;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--text-3);
}
.iot-status.live {
  color: var(--ok);
}
.iot-status.reconnecting {
  color: var(--accent);
}
.iot-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}
.iot-desc {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--text-3);
}
.iot-toggle {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 13px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--panel-2);
  color: var(--text);
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
}
.iot-toggle:hover {
  border-color: var(--accent);
}
.event-log {
  border-top: 1px solid var(--border-soft);
  padding-top: 10px;
}
.event-log-title {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.11em;
  color: var(--text-3);
  margin-bottom: 6px;
}
.event-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 4px 0;
  font-size: 11px;
}
.ev-name {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-2);
  font-family: 'IBM Plex Sans', sans-serif;
}
.ev-delta {
  font-weight: 600;
}
.ev-delta.up {
  color: var(--ok);
}
.ev-delta.down {
  color: var(--danger);
}
.event-empty {
  font-size: 11px;
  padding: 4px 0;
}

/* ---- inventory table ---- */
table {
  width: 100%;
  border-collapse: collapse;
}
th {
  text-align: left;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-3);
  padding: 9px 14px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
th.num {
  text-align: right;
}
th.level-col {
  width: 120px;
}
td {
  padding: 9px 14px;
  border-bottom: 1px solid var(--border-soft);
  font-size: 13px;
  vertical-align: middle;
}
tbody tr.low {
  background: var(--danger-soft);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.item-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}
.swatch {
  width: 11px;
  height: 11px;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.35);
  flex-shrink: 0;
}
.item-name {
  font-weight: 500;
}
.item-cat {
  font-size: 10.5px;
}
.loc {
  font-size: 12px;
}
.stock-num {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  transition: color 0.3s;
}
.stock-num.danger {
  color: var(--danger);
}
.value-num {
  font-size: 12.5px;
  color: var(--text);
}
td.num.mono.muted {
  font-size: 12.5px;
}
.level-track {
  display: block;
  height: 7px;
  background: var(--track);
  border-radius: 4px;
  overflow: hidden;
}
.level-fill {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: var(--ok);
  transition: width 0.4s ease;
}
.level-fill.danger {
  background: var(--danger);
}
.tag {
  display: inline-flex;
  align-items: center;
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: 5px;
}
.tag.ok {
  background: var(--ok-soft);
  color: var(--ok);
}
.tag.danger {
  background: var(--danger-soft);
  color: var(--danger);
}

@media (max-width: 860px) {
  .kpis {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
