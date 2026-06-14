<script setup lang="ts">
import MeshList from '../components/MeshList.vue';
import MaterialEditor from '../components/MaterialEditor.vue';
import BomSummary from '../components/BomSummary.vue';
</script>

<template>
  <div class="layout">
    <div class="top-grid">
      <MeshList class="area-list" />
      <MaterialEditor class="area-editor" />
    </div>
    <BomSummary />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1240px;
}
.top-grid {
  display: grid;
  grid-template-columns: 312px 1fr;
  gap: 14px;
  align-items: start;
}
@media (max-width: 760px) {
  .top-grid {
    grid-template-columns: 1fr;
  }
}
</style>
