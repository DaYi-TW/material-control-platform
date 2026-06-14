<script setup lang="ts">
import { usePartsStore } from '../stores/parts';
import { formatCurrency } from '../lib/pricing';

const store = usePartsStore();
</script>

<template>
  <section class="panel bom">
    <div class="panel-head">
      <span class="panel-title">BOM 物料清單預估</span>
      <span class="mono count">{{ store.parts.length }} 項</span>
    </div>

    <table>
      <thead>
        <tr>
          <th>零件名稱</th>
          <th>色碼</th>
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
          <td class="name">{{ part.name }}</td>
          <td>
            <span class="color-cell">
              <span class="swatch" :style="{ background: part.color }" />
              <span class="mono muted">{{ part.color.toLowerCase() }}</span>
            </span>
          </td>
          <td class="num mono pm">
            {{ formatCurrency(part.basePrice) }} ×{{ part.multiplier.toFixed(1) }}
          </td>
          <td class="num price">{{ formatCurrency(store.lineTotalOf(part)) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="grand">
      <span class="grand-label">專案總估價 · GRAND TOTAL</span>
      <span class="price grand-amount">{{ formatCurrency(store.grandTotal) }}</span>
    </div>
  </section>
</template>

<style scoped>
.count {
  font-size: 11px;
  color: var(--text-3);
}
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
}
th.num {
  text-align: right;
}
td {
  padding: 9px 14px;
  border-bottom: 1px solid var(--border-soft);
  font-size: 13px;
}
tbody tr {
  cursor: pointer;
}
tbody tr:hover {
  background: var(--panel-2);
}
tbody tr.active {
  background: var(--accent-soft);
}
.name {
  font-weight: 500;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.pm {
  font-size: 12.5px;
  color: var(--text-2);
}
.color-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.swatch {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.35);
  flex-shrink: 0;
}
.color-cell .mono {
  font-size: 12px;
}
.grand {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 14px;
  padding: 14px 16px;
  border-top: 1px solid var(--border);
}
.grand-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-3);
}
.grand-amount {
  font-size: 24px;
}
</style>
