<template>
  <NuiField label="Теги">
    <NuiSelect v-model:values="tags" :options="options" multiple clearable />
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiSelect, type NuiOptionSource } from '@numior/vue';

const tags = ref(['frontend']);

const options: NuiOptionSource<string> = [
  { value: 'frontend', label: 'Фронтенд' },
  { value: 'backend', label: 'Бэкенд' },
  { value: 'design', label: 'Дизайн' },
];
</script>
