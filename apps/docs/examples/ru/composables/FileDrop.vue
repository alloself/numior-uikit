<template>
  <div class="flex flex-col gap-3 w-full max-w-sm">
    <div
      v-bind="drop.attrs"
      class="border rounded-md p-4 text-center text-sm"
      :class="drop.dragging.value ? 'bg-primary-soft' : 'bg-surface-muted'"
    >
      Перетащите файлы сюда
    </div>
    <ul v-if="names.length > 0" class="m-0 text-sm">
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
