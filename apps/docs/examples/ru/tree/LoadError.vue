<template>
  <div class="flex flex-col gap-3">
    <NuiTree
      variant="bordered"
      v-model:expanded="expanded"
      :items="folders"
      label="Хранилище"
      class="w-full max-w-sm"
      @load="load"
    />
    <NuiAlert
      v-if="error"
      tone="error"
      variant="soft"
      title="Не удалось загрузить папку"
      :description="error"
      closable
      @close="error = undefined"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiAlert, NuiTree, type NuiTreeItem } from '@numior/vue';

const folders = ref<NuiTreeItem<string>[]>([
  { value: 'photos', label: 'Фотографии', lazy: true },
  { value: 'reports', label: 'Отчёты', lazy: true },
]);

const expanded = ref<string[]>([]);
const error = ref<string>();
const attempts = ref<Record<string, number>>({});

const fetchChildren = (item: NuiTreeItem<string>): Promise<NuiTreeItem<string>[]> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const attempt = (attempts.value[item.value] ?? 0) + 1;
      attempts.value = { ...attempts.value, [item.value]: attempt };

      if (item.value === 'reports' && attempt === 1) {
        reject(new Error('timeout'));
        return;
      }

      resolve([
        { value: `${item.value}-2025`, label: `${item.label} 2025` },
        { value: `${item.value}-2026`, label: `${item.label} 2026` },
      ]);
    }, 600);
  });

const load = async (item: NuiTreeItem<string>): Promise<void> => {
  error.value = undefined;
  try {
    const children = await fetchChildren(item);

    folders.value = folders.value.map((folder) =>
      folder.value === item.value ? { ...folder, children } : folder,
    );
  } catch {
    expanded.value = expanded.value.filter((value) => value !== item.value);
    error.value = `«${item.label}»: сервер не ответил. Раскройте папку ещё раз.`;
  }
};
</script>
