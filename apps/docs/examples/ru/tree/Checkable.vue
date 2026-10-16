<template>
  <div class="flex flex-col gap-3">
    <NuiTree
      variant="bordered"
      v-model:values="checked"
      :items="files"
      checkable
      label="Экспорт"
      class="w-full max-w-sm"
    />
    <p class="text-sm text-muted-foreground">Отмечено: {{ checked.length }}</p>
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

const checked = ref(['button']);
</script>
