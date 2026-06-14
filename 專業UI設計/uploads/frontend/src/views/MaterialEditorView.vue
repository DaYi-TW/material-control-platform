<script setup lang="ts">
import MeshList from '../components/MeshList.vue';
import MaterialEditor from '../components/MaterialEditor.vue';
import BomSummary from '../components/BomSummary.vue';
</script>

<template>
  <div class="layout">
    <MeshList class="area-list" />
    <MaterialEditor class="area-editor" />
    <BomSummary class="area-bom" />
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(300px, 360px) 1fr;
  grid-template-areas:
    'list editor'
    'bom  bom';
  gap: 18px;
  align-items: start;
}
.area-list {
  grid-area: list;
  max-height: 460px;
}
.area-editor {
  grid-area: editor;
}
.area-bom {
  grid-area: bom;
}
@media (max-width: 760px) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      'list'
      'editor'
      'bom';
  }
  .area-list {
    max-height: 320px;
  }
}
</style>
