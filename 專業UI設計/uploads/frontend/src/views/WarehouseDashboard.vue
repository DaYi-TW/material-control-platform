<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { usePartsStore } from '../stores/parts';
import { formatCurrency, lineTotal } from '../lib/pricing';

const store = usePartsStore();

// IoT 即時模擬:進入看板時啟動,離開時停止
const iotOn = ref(true);
onMounted(() => {
  if (iotOn.value) store.startIotSimulation(1500);
});
onUnmounted(() => store.stopIotSimulation());

function toggleIot() {
  iotOn.value = !iotOn.value;
  if (iotOn.value) store.startIotSimulation(1500);
  else store.stopIotSimulation();
}

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
        <div class="kpi-value">{{ store.parts.length }}</div>
        <div class="kpi-foot muted">SKU 種類</div>
      </div>
      <div class="kpi panel">
        <div class="kpi-label">庫存總量</div>
        <div class="kpi-value">{{ store.totalStock.toLocaleString() }}</div>
        <div class="kpi-foot muted">件 · 即時</div>
      </div>
      <div class="kpi panel">
        <div class="kpi-label">庫存總價值</div>
        <div class="kpi-value price">{{ formatCurrency(store.inventoryValue) }}</div>
        <div class="kpi-foot muted">單價 × 加成 × 庫存</div>
      </div>
      <div class="kpi panel" :class="{ alert: store.lowStockParts.length > 0 }">
        <div class="kpi-label">低於安全庫存</div>
        <div class="kpi-value" :class="{ danger: store.lowStockParts.length > 0 }">
          {{ store.lowStockParts.length }}
        </div>
        <div class="kpi-foot muted">項需補貨</div>
      </div>
    </div>

    <div class="grid">
      <!-- 分類庫存價值長條圖 -->
      <section class="panel chart-card">
        <h2 class="panel-title">📊 各分類庫存價值佔比</h2>
        <ul class="bars">
          <li v-for="c in store.categoryBreakdown" :key="c.category" class="bar-row">
            <span class="bar-label">{{ c.category }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: (c.value / maxCatValue) * 100 + '%' }" />
            </div>
            <span class="bar-value price">{{ formatCurrency(c.value) }}</span>
          </li>
        </ul>
      </section>

      <!-- IoT 即時狀態 -->
      <section class="panel iot-card">
        <h2 class="panel-title">
          <span class="live-dot" :class="{ on: iotOn }" />
          IoT 即時數據流
        </h2>
        <p class="muted iot-desc">
          模擬感測器每 1.5 秒回報庫存異動,看板即時刷新。
        </p>
        <button class="iot-toggle" @click="toggleIot">
          {{ iotOn ? '⏸ 暫停資料流' : '▶ 啟動資料流' }}
        </button>
      </section>
    </div>

    <!-- 庫存明細表 -->
    <section class="panel table-card">
      <header class="table-head">
        <h2 class="panel-title">📦 庫存明細 (Inventory)</h2>
        <span class="muted">總計 {{ store.parts.length }} 項</span>
      </header>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>料件</th>
              <th>儲位</th>
              <th class="num">庫存量</th>
              <th>水位</th>
              <th class="num">安全庫存</th>
              <th class="num">庫存價值</th>
              <th>狀態</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in store.parts" :key="p.id" :class="{ low: p.stock < p.safetyStock }">
              <td>
                <span class="swatch" :style="{ background: p.color }" />
                {{ p.name }}
                <span class="muted cat">· {{ p.category }}</span>
              </td>
              <td class="mono muted">{{ p.location }}</td>
              <td class="num mono stock-num" :class="{ danger: p.stock < p.safetyStock }">
                {{ p.stock }}
              </td>
              <td class="level-cell">
                <div class="level-track">
                  <div
                    class="level-fill"
                    :class="{ danger: p.stock < p.safetyStock }"
                    :style="{ width: stockRatio(p.stock, p.safetyStock) * 100 + '%' }"
                  />
                </div>
              </td>
              <td class="num mono muted">{{ p.safetyStock }}</td>
              <td class="num price">
                {{ formatCurrency(lineTotal(p.basePrice, p.multiplier) * p.stock) }}
              </td>
              <td>
                <span v-if="p.stock < p.safetyStock" class="tag danger">需補貨</span>
                <span v-else class="tag ok">正常</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dash {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.kpi {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.kpi.alert {
  border-color: #fecaca;
  background: linear-gradient(180deg, #fff, #fff5f5);
}
.kpi-label {
  font-size: 12px;
  color: var(--text-soft);
  font-weight: 600;
}
.kpi-value {
  font-size: 26px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.kpi-value.danger {
  color: #dc2626;
}
.kpi-foot {
  font-size: 11px;
}

.grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 18px;
}
.chart-card,
.iot-card {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.bars {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bar-row {
  display: grid;
  grid-template-columns: 90px 1fr auto;
  align-items: center;
  gap: 12px;
}
.bar-label {
  font-size: 13px;
  font-weight: 600;
}
.bar-track {
  height: 14px;
  background: var(--panel-soft);
  border-radius: 7px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #4f46e5);
  border-radius: 7px;
  transition: width 0.5s ease;
}
.bar-value {
  font-size: 13px;
  min-width: 72px;
  text-align: right;
}
.iot-desc {
  font-size: 12px;
  margin: 0;
  line-height: 1.6;
}
.iot-toggle {
  align-self: flex-start;
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 9px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text);
}
.iot-toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.live-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #cbd5e1;
  display: inline-block;
}
.live-dot.on {
  background: #16a34a;
  box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.6);
  animation: pulse 1.4s infinite;
}
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.5);
  }
  70% {
    box-shadow: 0 0 0 7px rgba(22, 163, 74, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0);
  }
}

.table-card {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th {
  text-align: left;
  font-weight: 600;
  color: var(--text-soft);
  font-size: 12px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
td {
  padding: 11px 10px;
  border-bottom: 1px solid #f1f3f8;
  vertical-align: middle;
}
tbody tr.low {
  background: #fff7f7;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.mono {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
}
.stock-num {
  font-weight: 700;
  transition: color 0.3s;
}
.stock-num.danger,
.kpi-value.danger {
  color: #dc2626;
}
.cat {
  font-size: 12px;
}
.swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  vertical-align: middle;
  margin-right: 8px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
}
.level-cell {
  width: 110px;
}
.level-track {
  height: 8px;
  background: var(--panel-soft);
  border-radius: 5px;
  overflow: hidden;
}
.level-fill {
  height: 100%;
  background: #16a34a;
  border-radius: 5px;
  transition: width 0.4s ease;
}
.level-fill.danger {
  background: #dc2626;
}
.tag {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
.tag.ok {
  color: #16a34a;
  background: #dcfce7;
}
.tag.danger {
  color: #dc2626;
  background: #fee2e2;
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
