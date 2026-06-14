<script setup lang="ts">
import { usePartsStore } from '../stores/parts';
import { formatCurrency } from '../lib/pricing';

const store = usePartsStore();
</script>

<template>
  <section class="panel mesh-list">
    <div class="panel-head">
      <span class="panel-title">模型零件清單</span>
      <span class="mono count">{{ store.parts.length }} 項</span>
    </div>

    <p v-if="store.loading" class="state muted">載入中…</p>
    <p v-else-if="store.loadError" class="state error">載入失敗:{{ store.loadError }}</p>

    <div v-else class="rows">
      <button
        v-for="part in store.parts"
        :key="part.id"
        class="row"
        :class="{ active: part.id === store.selectedId }"
        @click="store.selectPart(part.id)"
      >
        <span class="row-bar" />
        <span class="row-main">
          <span class="row-name">{{ part.name }}</span>
          <span class="row-cat muted">{{ part.category }}</span>
        </span>
        <span class="row-right">
          <span class="price">{{ formatCurrency(store.lineTotalOf(part)) }}</span>
          <span class="dot" :style="{ background: part.color }" :title="part.color" />
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.mesh-list {
  display: flex;
  flex-direction: column;
}
.count {
  font-size: 11px;
  color: var(--text-3);
}
.state {
  font-size: 13px;
  margin: 0;
  padding: 14px;
}
.state.error {
  color: var(--danger);
}
.rows {
  max-height: 432px;
  overflow-y: auto;
}
.row {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 13px 9px 14px;
  border: none;
  border-bottom: 1px solid var(--border-soft);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  background: transparent;
  color: var(--text);
}
.row:hover {
  background: var(--panel-2);
}
.row.active {
  background: var(--accent-soft);
}
.row-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2.5px;
  background: transparent;
}
.row.active .row-bar {
  background: var(--accent);
}
.row-main {
  min-width: 0;
}
.row-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-cat {
  display: block;
  font-size: 10.5px;
  margin-top: 2px;
  letter-spacing: 0.02em;
}
.row-right {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
}
.price {
  font-size: 12px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.35);
  flex-shrink: 0;
}
</style>
