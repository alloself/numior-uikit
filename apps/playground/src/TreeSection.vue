<template>
  <section class="panel" aria-labelledby="tree-title">
    <div class="section-heading">
      <h2 id="tree-title">Дерево</h2>
      <span class="tag">NuiTree · useVirtualList</span>
    </div>
    <div class="data-lists">
      <NuiTree
        v-model="selected"
        v-model:expanded="expanded"
        :items="files"
        label="Файлы"
        variant="bordered"
        data-testid="data-tree"
        @load="loadDocs"
      />
      <NuiTree
        v-model:values="checked"
        :items="files"
        checkable
        label="Экспорт"
        variant="bordered"
        data-testid="data-tree-check"
      />
      <NuiTree
        v-model="virtualSelected"
        :items="nodes"
        virtual
        height="12rem"
        label="Большое дерево"
        variant="bordered"
        data-testid="data-tree-virtual"
      />
    </div>
    <pre class="output" data-testid="tree-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiTree, type NuiTreeItem } from '@numior/vue';

const base: NuiTreeItem<string>[] = [
  {
    value: 'src',
    label: 'Исходники',
    children: [
      {
        value: 'components',
        label: 'Компоненты',
        children: [
          { value: 'button', label: 'Кнопка.vue' },
          { value: 'input', label: 'Поле.vue', disabled: true },
        ],
      },
      { value: 'index', label: 'index.ts', description: 'точка входа' },
    ],
  },
  { value: 'docs', label: 'Документация', lazy: true },
  {
    value: 'legacy',
    label: 'Устаревшее',
    disabled: true,
    children: [{ value: 'old', label: 'old.js' }],
  },
  { value: 'empty', label: 'Пусто', children: [] },
  {
    value: 'design',
    label: 'Дизайн',
    children: [{ value: 'logo', label: 'logo.svg', icon: 'image' }],
  },
];

const docs: NuiTreeItem<string>[] = [
  { value: 'guide', label: 'Руководство.md' },
  { value: 'api', label: 'API.md' },
];

const nodes: NuiTreeItem<string>[] = Array.from({ length: 10_000 }, (_, index) => ({
  value: `n${index + 1}`,
  label: `Узел ${index + 1}`,
  children: [{ value: `n${index + 1}-leaf`, label: `Лист ${index + 1}` }],
}));

const files = ref(base);
const selected = ref<string>();
const expanded = ref<string[]>([]);
const checked = ref<string[]>([]);
const loaded = ref<string[]>([]);
const virtualSelected = ref<string>();

const loadDocs = ({ value }: { readonly value: string | undefined }): void => {
  if (value === undefined) {
    return;
  }

  setTimeout(() => {
    files.value = files.value.map((entry) =>
      entry.value === value ? { ...entry, children: docs } : entry,
    );

    loaded.value = [...loaded.value, value];
  }, 400);
};

const output = computed(() =>
  JSON.stringify(
    {
      selected: selected.value ?? null,
      expanded: expanded.value,
      checked: checked.value,
      loaded: loaded.value,
      virtualSelected: virtualSelected.value ?? null,
    },
    null,
    2,
  ),
);
</script>
