<script setup lang="ts">
import { computed } from 'vue';
import { usePartsStore } from '../stores/parts';
import { formatCurrency, lineTotal } from '../lib/pricing';
import SaveIndicator from './SaveIndicator.vue';

const store = usePartsStore();
const part = computed(() => store.selectedPart);

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

// 顏色:color picker 與 hex 文字框雙向同步;hex 合法才送出
function onColorPicker(e: Event) {
  const v = (e.target as HTMLInputElement).value.toUpperCase();
  if (part.value) store.applyLocalUpdate(part.value.id, { color: v });
}
function onHexInput(e: Event) {
  const v = (e.target as HTMLInputElement).value.trim().toUpperCase();
  if (part.value && HEX_RE.test(v)) store.applyLocalUpdate(part.value.id, { color: v });
}

function onBasePrice(e: Event) {
  const v = Math.max(0, Number((e.target as HTMLInputElement).value) || 0);
  if (part.value) store.applyLocalUpdate(part.value.id, { basePrice: v });
}

// Slider:input 事件每次都「即時」更新本地畫面;真正的 API 持久化由 store 內 debounce 合併
function onMultiplier(e: Event) {
  const v = Number((e.target as HTMLInputElement).value);
  if (part.value) store.applyLocalUpdate(part.value.id, { multiplier: v });
}

const preview = computed(() =>
  part.value ? lineTotal(part.value.basePrice, part.value.multiplier) : 0,
);
</script>

<template>
  <section class="panel editor">
    <header class="editor-head">
      <h2 class="panel-title">材質與屬性編輯器</h2>
      <SaveIndicator
        v-if="part"
        :status="store.statusOf(part.id)"
        @retry="store.retry(part.id)"
      />
    </header>

    <div v-if="!part" class="empty muted">← 從左側清單選擇一個零件以編輯</div>

    <div v-else class="form">
      <div class="part-head">
        <span class="dot" :style="{ background: part.color }" />
        <div>
          <div class="part-name">{{ part.name }}</div>
          <div class="muted part-meta">
            {{ part.category }} · {{ part.metadata.material }} · {{ part.metadata.weight }}
          </div>
        </div>
      </div>

      <div class="grid">
        <label class="field">
          <span class="label">材質顏色 (Albedo Color)</span>
          <div class="color-row">
            <input
              type="color"
              class="swatch"
              :value="part.color"
              @input="onColorPicker"
              aria-label="顏色選擇器"
            />
            <input
              type="text"
              class="text-input mono"
              :value="part.color"
              maxlength="7"
              spellcheck="false"
              @input="onHexInput"
              aria-label="十六進位色碼"
            />
          </div>
        </label>

        <label class="field">
          <span class="label">基礎單價 (Base Price)</span>
          <input
            type="number"
            class="text-input"
            min="0"
            step="10"
            :value="part.basePrice"
            @input="onBasePrice"
          />
        </label>
      </div>

      <label class="field">
        <span class="label-row">
          <span class="label">材質複雜度加成 (Multiplier)</span>
          <span class="mult-badge">{{ part.multiplier.toFixed(1) }}x</span>
        </span>
        <input
          type="range"
          class="slider"
          min="1"
          max="5"
          step="0.1"
          :value="part.multiplier"
          @input="onMultiplier"
        />
        <div class="slider-scale muted">
          <span>基礎 (1.0x)</span>
          <span>極高 (5.0x)</span>
        </div>
      </label>

      <div class="preview-line">
        <span class="muted">即時小計</span>
        <span class="price preview-amount">{{ formatCurrency(preview) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.editor {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.empty {
  padding: 32px 8px;
  text-align: center;
  font-size: 13px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.part-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.part-head .dot {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
.part-name {
  font-weight: 700;
  font-size: 15px;
}
.part-meta {
  font-size: 12px;
  margin-top: 2px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-soft);
}
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mult-badge {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.text-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 9px;
  font-size: 14px;
  background: var(--panel-soft);
  color: var(--text);
  transition: border-color 0.12s, box-shadow 0.12s;
}
.text-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
  background: #fff;
}
.mono {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
}
.color-row {
  display: flex;
  gap: 8px;
}
.swatch {
  width: 42px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: none;
  cursor: pointer;
}
.slider {
  width: 100%;
  accent-color: var(--accent);
  cursor: pointer;
}
.slider-scale {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}
.preview-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
}
.preview-amount {
  font-size: 18px;
}
</style>
