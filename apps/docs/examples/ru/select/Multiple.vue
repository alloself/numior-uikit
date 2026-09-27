<template>
  <NuiSelect label="Теги" v-model:values="tags" :options="options" multiple clearable />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect, type NuiOptionSource } from '@numior/vue';

const tags = ref(['frontend']);

const options: NuiOptionSource<string> = [
  { value: 'frontend', label: 'Фронтенд' },
  { value: 'backend', label: 'Бэкенд' },
  { value: 'design', label: 'Дизайн' },
];
</script>
