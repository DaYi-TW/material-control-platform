<script setup lang="ts">
import { usePartsStore } from '../stores/parts';
import { formatCurrency } from '../lib/pricing';

const store = usePartsStore();
</script>

<template>
  <section class="panel mesh-list">
    <h2 class="panel-title">模型零件清單</h2>

    <p v-if="store.loading" class="muted state">載入中…</p>
    <p v-else-if="store.loadError" class="state error">載入失敗:{{ store.loadError }}</p>

    <ul v-else class="rows">
      <li
        v-for="part in store.parts"
        :key="part.id"
        class="row"
        :class="{ active: part.id === store.selectedId }"
        @click="store.selectPart(part.id)"
      >
        <div class="row-main">
          <div class="row-name">{{ part.name }}</div>
          <div class="row-cat muted">{{ part.category }}</div>
        </div>
        <div class="row-right">
          <span class="price">{{ formatCurrency(store.lineTotalOf(part)) }}</span>
          <span class="dot" :style="{ background: part.color }" :title="part.color" />
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.mesh-list {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
.state {
  font-size: 13px;
  margin: 0;
}
.state.error {
  color: #dc2626;
}
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--panel-soft);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.row:hover {
  background: #eef2fb;
}
.row.active {
  background: var(--accent-soft);
  border-color: #bfdbfe;
}
.row-name {
  font-size: 14px;
  font-weight: 600;
}
.row-cat {
  font-size: 12px;
  margin-top: 2px;
}
.row-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px #fff, 0 0 0 3px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}
</style>
