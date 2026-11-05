<template>
  <NuiTabs v-model="page" :links="pages" label="Разделы проекта" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTabs, type NuiTabLinkDescriptor } from '@numior/vue';

const page = ref('#tabs-summary');

const pages: NuiTabLinkDescriptor[] = [
  { to: '#tabs-summary', label: 'Сводка' },
  { to: '#tabs-tasks', label: 'Задачи' },
  { to: '#tabs-files', label: 'Файлы' },
  { to: '#tabs-access', label: 'Доступ', disabled: true },
];
</script>
