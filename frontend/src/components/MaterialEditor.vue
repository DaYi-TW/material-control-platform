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
    <div class="panel-head">
      <span class="panel-title">材質與屬性編輯器</span>
      <SaveIndicator
        v-if="part"
        :status="store.statusOf(part.id)"
        @retry="store.retry(part.id)"
      />
    </div>

    <div v-if="!part" class="empty muted">← 從左側清單選擇一個零件以編輯</div>

    <div v-else class="form">
      <div class="part-head">
        <span class="part-swatch" :style="{ background: part.color }" />
        <div>
          <div class="part-name">{{ part.name }}</div>
          <div class="part-meta mono">
            {{ part.category }} · {{ part.metadata.material }} · {{ part.metadata.weight }}
          </div>
        </div>
      </div>

      <div class="grid">
        <label class="field">
          <span class="label">材質顏色 · ALBEDO</span>
          <div class="color-row">
            <input
              type="color"
              class="picker"
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
          <span class="label">基礎單價 · BASE PRICE</span>
          <input
            type="number"
            class="text-input mono"
            min="0"
            step="10"
            :value="part.basePrice"
            @input="onBasePrice"
          />
        </label>
      </div>

      <div class="field slider-field">
        <div class="label-row">
          <span class="label">材質複雜度加成 · MULTIPLIER</span>
          <span class="mult-badge mono">{{ part.multiplier.toFixed(1) }}×</span>
        </div>
        <input
          type="range"
          class="slider"
          min="1"
          max="5"
          step="0.1"
          :value="part.multiplier"
          @input="onMultiplier"
        />
        <div class="slider-scale mono muted">
          <span>基礎 1.0×</span>
          <span>極高 5.0×</span>
        </div>
      </div>

      <div class="preview-line">
        <span class="preview-label">即時小計 · LINE TOTAL</span>
        <span class="price preview-amount">{{ formatCurrency(preview) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
}
.empty {
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
}
.form {
  padding: 16px;
}
.part-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-soft);
}
.part-swatch {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.3);
  flex-shrink: 0;
}
.part-name {
  font-weight: 600;
  font-size: 15px;
}
.part-meta {
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 2px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.slider-field {
  gap: 9px;
  margin-top: 18px;
}
.label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-3);
  white-space: nowrap;
}
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mult-badge {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}
.text-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 7px;
  font-size: 13px;
  background: var(--panel-2);
  color: var(--text);
  transition: border-color 0.12s, box-shadow 0.12s;
}
.text-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.color-row {
  display: flex;
  gap: 8px;
}
.picker {
  width: 42px;
  height: 38px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--panel-2);
  cursor: pointer;
  flex-shrink: 0;
}
.slider {
  width: 100%;
  accent-color: var(--accent);
  cursor: pointer;
}
.slider-scale {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
}
.preview-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border-soft);
}
.preview-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-3);
}
.preview-amount {
  font-size: 22px;
}
</style>
