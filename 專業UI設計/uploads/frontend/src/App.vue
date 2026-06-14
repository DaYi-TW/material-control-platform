<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { usePartsStore } from './stores/parts';
import MaterialEditorView from './views/MaterialEditorView.vue';
import WarehouseDashboard from './views/WarehouseDashboard.vue';

type Tab = 'editor' | 'warehouse';
const tab = ref<Tab>('editor');

const store = usePartsStore();
onMounted(() => store.fetchParts());
</script>

<template>
  <div class="app">
    <header class="app-bar">
      <div class="brand">
        <span class="logo">◆</span>
        <div>
          <div class="title">智慧製造 · 物料管理平台</div>
          <div class="subtitle muted">Material Editor · WMS / IoT Dashboard</div>
        </div>
      </div>
      <button class="reload" :disabled="store.loading" @click="store.fetchParts()">
        {{ store.loading ? '載入中…' : '重新載入' }}
      </button>
    </header>

    <nav class="tabs">
      <button class="tab" :class="{ active: tab === 'editor' }" @click="tab = 'editor'">
        材質編輯器
      </button>
      <button class="tab" :class="{ active: tab === 'warehouse' }" @click="tab = 'warehouse'">
        WMS / IoT 看板
      </button>
    </nav>

    <main>
      <MaterialEditorView v-if="tab === 'editor'" />
      <WarehouseDashboard v-else />
    </main>
  </div>
</template>

<style scoped>
.app {
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100vh;
}
.app-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  font-size: 16px;
}
.title {
  font-weight: 800;
  font-size: 16px;
}
.subtitle {
  font-size: 11px;
  letter-spacing: 0.04em;
}
.reload {
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 9px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text);
  box-shadow: var(--shadow);
}
.reload:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.reload:disabled {
  opacity: 0.6;
  cursor: default;
}

.tabs {
  display: flex;
  gap: 6px;
  border-bottom: 1px solid var(--border);
}
.tab {
  border: none;
  background: none;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-soft);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab:hover {
  color: var(--text);
}
.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
</style>
