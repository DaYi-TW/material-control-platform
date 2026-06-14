<script setup lang="ts">
import { usePartsStore } from '../stores/parts';
import { formatCurrency } from '../lib/pricing';

const store = usePartsStore();
</script>

<template>
  <section class="panel bom">
    <header class="bom-head">
      <h2 class="panel-title">📦 BOM 物料清單預估</h2>
      <span class="muted count">總計 {{ store.parts.length }} 項</span>
    </header>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>零件名稱</th>
            <th>顏色預覽</th>
            <th class="num">單價 × 加成</th>
            <th class="num">小計</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="part in store.parts"
            :key="part.id"
            :class="{ active: part.id === store.selectedId }"
            @click="store.selectPart(part.id)"
          >
            <td>{{ part.name }}</td>
            <td>
              <span class="swatch" :style="{ background: part.color }" />
              <span class="mono muted">{{ part.color.toLowerCase() }}</span>
            </td>
            <td class="num mono">
              {{ formatCurrency(part.basePrice) }} <span class="muted">×{{ part.multiplier.toFixed(1) }}</span>
            </td>
            <td class="num price">{{ formatCurrency(store.lineTotalOf(part)) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="grand">
      <span>專案總估價:</span>
      <span class="grand-amount">{{ formatCurrency(store.grandTotal) }}</span>
    </footer>
  </section>
</template>

<style scoped>
.bom {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bom-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.count {
  font-size: 12px;
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
}
td {
  padding: 11px 10px;
  border-bottom: 1px solid #f1f3f8;
}
tr {
  cursor: pointer;
  transition: background 0.1s;
}
tbody tr:hover {
  background: var(--panel-soft);
}
tbody tr.active {
  background: var(--accent-soft);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.mono {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
}
.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  vertical-align: middle;
  margin-right: 8px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
}
.grand {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 12px;
  font-size: 14px;
  font-weight: 600;
}
.grand-amount {
  font-size: 24px;
  font-weight: 800;
  color: var(--price);
  font-variant-numeric: tabular-nums;
}
</style>
