<template>
  <div class="flex flex-col gap-3">
    <NuiTree
      variant="outline"
      v-model="selected"
      v-model:expanded="expanded"
      :items="files"
      label="Файлы проекта"
      class="w-full max-w-sm"
    />
    <p class="text-sm text-muted-foreground">Выбран: {{ selected ?? '—' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTree, type NuiTreeItem } from '@numior/vue';

const files: NuiTreeItem<string>[] = [
  {
    value: 'src',
    label: 'src',
    children: [
      {
        value: 'components',
        label: 'components',
        children: [
          { value: 'button', label: 'Button.vue' },
          { value: 'input', label: 'Input.vue' },
        ],
      },
      { value: 'main', label: 'main.ts' },
    ],
  },
  { value: 'docs', label: 'docs', children: [{ value: 'guide', label: 'guide.md' }] },
  { value: 'readme', label: 'README.md' },
];

const selected = ref<string | null>('main');
const expanded = ref(['src']);
</script>
