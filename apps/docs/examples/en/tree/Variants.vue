<template>
  <div class="flex flex-col gap-3">
    <NuiTree
      v-model="selected"
      v-model:expanded="expanded"
      :items="changes"
      variant="bordered"
      size="sm"
      label="Changes"
      class="w-full max-w-sm"
    />
    <p class="text-sm text-muted-foreground">Open: {{ selected ?? '—' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTree, type NuiTreeItem } from '@numior/vue';

const changes: NuiTreeItem<string>[] = [
  {
    value: 'src',
    label: 'src',
    badge: 2,
    children: [
      { value: 'app', label: 'App.vue', badge: 'M' },
      { value: 'main', label: 'main.ts', badge: 'M', current: true },
    ],
  },
  { value: 'readme', label: 'README.md', badge: 'A' },
  { value: 'lock', label: 'pnpm-lock.yaml', disabled: true, description: 'unchanged' },
];

const selected = ref<string | null>('main');
const expanded = ref(['src']);
</script>
