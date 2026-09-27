<template>
  <NuiCombobox
    v-model:values="tags"
    :options="options"
    :custom-value="(text) => text"
    label="Теги задачи"
    description="Enter добавляет свой тег"
    multiple
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCombobox, type NuiOptionSource } from '@numior/vue';

const tags = ref(['frontend']);

const options: NuiOptionSource<string> = [
  { value: 'frontend', label: 'Фронтенд' },
  { value: 'backend', label: 'Бэкенд' },
  { value: 'design', label: 'Дизайн' },
  { value: 'urgent', label: 'Срочно' },
];
</script>
