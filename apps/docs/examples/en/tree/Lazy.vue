<template>
  <NuiTree :items="folders" label="Storage" class="nui-w-full nui-max-w-sm" @load="load" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTree, type NuiTreeItem } from '@numior/vue';

const folders = ref<NuiTreeItem<string>[]>([
  { value: 'photos', label: 'Photos', lazy: true },
  { value: 'reports', label: 'Reports', lazy: true },
]);

const load = (item: NuiTreeItem<string>): void => {
  setTimeout(() => {
    folders.value = folders.value.map((folder) =>
      folder.value === item.value
        ? {
            ...folder,
            children: [
              { value: `${folder.value}-2025`, label: `${folder.label} 2025` },
              { value: `${folder.value}-2026`, label: `${folder.label} 2026` },
            ],
          }
        : folder,
    );
  }, 600);
};
</script>
