<template>
  <div class="nui-flex nui-flex-col nui-gap-3 nui-w-full nui-max-w-sm">
    <div
      v-bind="drop.attrs"
      class="nui-border nui-rounded nui-p-4 nui-text-center nui-text-sm"
      :class="drop.dragging.value ? 'nui-bg-primary-soft' : 'nui-bg-surface-muted'"
    >
      Перетащите файлы сюда
    </div>
    <ul v-if="names.length > 0" class="nui-m-0 nui-text-sm">
      <li v-for="name in names" :key="name">{{ name }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useFileDrop } from '@numior/primitives';

const names = ref<string[]>([]);

const drop = useFileDrop({
  onFiles: (files) => {
    names.value = files.map((file) => file.name);
  },
});
</script>
