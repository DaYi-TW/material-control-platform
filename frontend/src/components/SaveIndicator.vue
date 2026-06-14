<script setup lang="ts">
import type { SaveStatus } from '../types';

defineProps<{ status: SaveStatus }>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <span class="indicator mono" :class="status">
    <template v-if="status === 'saving'">
      <span class="spinner" /> 儲存中…
    </template>
    <template v-else-if="status === 'error'">
      <span>⚠ 儲存失敗</span>
      <button class="retry" @click="$emit('retry')">重試</button>
    </template>
    <template v-else>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {{ status === 'saved' ? '已儲存' : '已同步' }}
    </template>
  </span>
</template>

<style scoped>
.indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  min-height: 16px;
  color: var(--ok);
}
.indicator.saving {
  color: var(--text-2);
}
.indicator.error {
  color: var(--danger);
}
.spinner {
  width: 11px;
  height: 11px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.retry {
  border: 1px solid var(--danger);
  background: transparent;
  color: var(--danger);
  border-radius: 5px;
  padding: 1px 8px;
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}
.retry:hover {
  background: var(--danger-soft);
}
</style>
