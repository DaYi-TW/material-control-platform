<script setup lang="ts">
import type { SaveStatus } from '../types';

defineProps<{ status: SaveStatus }>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <span class="indicator" :class="status">
    <template v-if="status === 'saving'">
      <span class="spinner" /> 儲存中…
    </template>
    <template v-else-if="status === 'saved'">✓ 已儲存</template>
    <template v-else-if="status === 'error'">
      ⚠ 儲存失敗
      <button class="retry" @click="$emit('retry')">重試</button>
    </template>
  </span>
</template>

<style scoped>
.indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  min-height: 18px;
  transition: opacity 0.2s;
}
.indicator.idle {
  opacity: 0;
}
.indicator.saving {
  color: var(--text-soft);
}
.indicator.saved {
  color: #16a34a;
}
.indicator.error {
  color: #dc2626;
}
.spinner {
  width: 11px;
  height: 11px;
  border: 2px solid #cbd5e1;
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.retry {
  border: 1px solid #fca5a5;
  background: #fff;
  color: #dc2626;
  border-radius: 6px;
  padding: 1px 8px;
  font-size: 12px;
  cursor: pointer;
}
.retry:hover {
  background: #fef2f2;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
