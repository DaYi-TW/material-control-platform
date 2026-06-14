<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usePartsStore } from './stores/parts';
import { formatCurrency } from './lib/pricing';
import MaterialEditorView from './views/MaterialEditorView.vue';
import WarehouseDashboard from './views/WarehouseDashboard.vue';

type Tab = 'editor' | 'warehouse';
const tab = ref<Tab>('editor');
const theme = ref<'dark' | 'light'>('light');

const store = usePartsStore();
const lastSync = ref('');

function syncStamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  lastSync.value = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

onMounted(async () => {
  await store.fetchParts();
  syncStamp();
});

function reload() {
  store.fetchParts().then(syncStamp);
}
function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}

const lowCount = computed(() => store.lowStockParts.length);
const pageCode = computed(() => (tab.value === 'editor' ? 'MAT-EDIT' : 'WMS-IOT'));
const pageTitle = computed(() => (tab.value === 'editor' ? '材質與屬性編輯器' : '庫存即時看板'));
const pageSub = computed(() =>
  tab.value === 'editor'
    ? '編輯零件材質、單價與複雜度加成,即時回算 BOM'
    : '感測器即時回報庫存異動,監控料件水位與補貨',
);
</script>

<template>
  <div class="shell" :data-theme="theme">
    <!-- ============ SIDEBAR(恆為深色) ============ -->
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#e0823c" stroke-width="1.7" stroke-linejoin="round">
            <path d="M12 2.5 3.5 7v10L12 21.5 20.5 17V7L12 2.5Z" />
            <path d="m3.5 7 8.5 4.6L20.5 7" />
            <path d="M12 11.6v9.9" />
          </svg>
        </span>
        <div class="brand-text">
          <div class="brand-title">物料管理平台</div>
          <div class="brand-sub">MATERIAL · WMS</div>
        </div>
      </div>

      <nav class="nav">
        <div class="nav-group">工作區</div>

        <button class="nav-item" :class="{ on: tab === 'editor' }" @click="tab = 'editor'">
          <span class="nav-bar" />
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
            <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z" />
            <path d="m3 12 9 4.5 9-4.5" />
            <path d="m3 16.5 9 4.5 9-4.5" />
          </svg>
          材質編輯器
        </button>

        <button class="nav-item" :class="{ on: tab === 'warehouse' }" @click="tab = 'warehouse'">
          <span class="nav-bar" />
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
            <path d="M3 9 12 4l9 5v8l-9 5-9-5V9Z" />
            <path d="m3 9 9 5 9-5" />
            <path d="M12 14v7" />
          </svg>
          庫存看板 WMS
          <span v-if="lowCount > 0" class="low-badge mono">{{ lowCount }}</span>
        </button>
      </nav>

      <div class="sidebar-foot">
        <div class="conn">
          <span class="conn-dot" />
          <div>
            <div class="conn-title">後端已連線</div>
            <div class="conn-meta mono">localhost:4000 · {{ lastSync }}</div>
          </div>
        </div>
        <button class="theme-toggle" @click="toggleTheme">
          <span class="theme-toggle-l">
            <svg v-if="theme === 'dark'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              <circle cx="12" cy="12" r="4" />
            </svg>
            {{ theme === 'dark' ? '深色模式' : '淺色模式' }}
          </span>
          <span class="theme-code mono">{{ theme === 'dark' ? 'DARK' : 'LIGHT' }}</span>
        </button>
      </div>
    </aside>

    <!-- ============ MAIN ============ -->
    <div class="main">
      <header class="topbar">
        <div class="topbar-l">
          <span class="page-code mono">{{ pageCode }}</span>
          <span class="vrule" />
          <div class="page-titles">
            <div class="page-title">{{ pageTitle }}</div>
            <div class="page-sub">{{ pageSub }}</div>
          </div>
        </div>
        <div class="topbar-r">
          <div class="stat-chip">
            <span class="mono stat-strong">{{ store.parts.length }}</span> SKU
            <span class="vrule sm" />
            <span class="mono stat-accent">{{ formatCurrency(store.inventoryValue) }}</span>
          </div>
          <button class="reload-btn" :disabled="store.loading" @click="reload">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v5h-5" />
            </svg>
            {{ store.loading ? '載入中…' : '重新載入' }}
          </button>
        </div>
      </header>

      <main class="content">
        <MaterialEditorView v-if="tab === 'editor'" />
        <WarehouseDashboard v-else />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  height: 100vh;
  display: flex;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}

/* ---- sidebar ---- */
.sidebar {
  width: 226px;
  flex-shrink: 0;
  background: var(--sidebar);
  border-right: 1px solid #23262c;
  display: flex;
  flex-direction: column;
  color: #c5cad1;
}
.brand {
  padding: 16px 16px 14px;
  border-bottom: 1px solid #23262c;
  display: flex;
  align-items: center;
  gap: 11px;
}
.brand-mark {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: #1f242b;
  border: 1px solid #2c323a;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.brand-title {
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #eceef1;
}
.brand-sub {
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.16em;
  color: #6a7079;
  margin-top: 1px;
}
.nav {
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.nav-group {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.13em;
  color: #5b616a;
  padding: 0 8px 8px;
}
.nav-item {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  background: transparent;
  color: #aeb4bc;
}
.nav-item:hover {
  color: #d4d9df;
}
.nav-item.on {
  background: var(--accent-soft);
  color: var(--accent);
}
.nav-bar {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 3px;
  background: transparent;
}
.nav-item.on .nav-bar {
  background: var(--accent);
}
.low-badge {
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 600;
  color: #fff;
  background: var(--danger);
  padding: 1px 6px;
  border-radius: 5px;
}
.sidebar-foot {
  margin-top: auto;
  padding: 12px 14px;
  border-top: 1px solid #23262c;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.conn {
  display: flex;
  align-items: center;
  gap: 9px;
}
.conn-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ok);
  animation: blink 2.4s ease-in-out infinite;
  flex-shrink: 0;
}
.conn-title {
  font-size: 11px;
  color: #bfc4cb;
  font-weight: 500;
}
.conn-meta {
  font-size: 9.5px;
  color: #6a7079;
}
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid #2c323a;
  border-radius: 7px;
  background: #1b2027;
  color: #bfc4cb;
  cursor: pointer;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 500;
}
.theme-toggle:hover {
  border-color: #3a414b;
}
.theme-toggle-l {
  display: flex;
  align-items: center;
  gap: 8px;
}
.theme-code {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: #6a7079;
}

/* ---- main ---- */
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.topbar {
  height: 56px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
}
.topbar-l {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}
.page-code {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--text-3);
  flex-shrink: 0;
}
.vrule {
  width: 1px;
  height: 16px;
  background: var(--border);
  flex-shrink: 0;
}
.vrule.sm {
  height: 12px;
}
.page-title {
  font-size: 14.5px;
  font-weight: 600;
  white-space: nowrap;
}
.page-sub {
  font-size: 11px;
  color: var(--text-3);
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.topbar-r {
  display: flex;
  align-items: center;
  gap: 9px;
}
.stat-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 11px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--panel-2);
  font-size: 11.5px;
  color: var(--text-2);
}
.stat-strong {
  font-weight: 600;
  color: var(--text);
  font-size: 12px;
}
.stat-accent {
  font-weight: 600;
  color: var(--accent);
  font-size: 12px;
}
.reload-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 13px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--panel);
  color: var(--text);
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
}
.reload-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.reload-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
.content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
}

@media (max-width: 720px) {
  .sidebar {
    width: 64px;
  }
  .brand-text,
  .nav-group,
  .nav-item,
  .conn div,
  .theme-toggle-l span:last-child,
  .theme-code {
    display: none;
  }
}
</style>
