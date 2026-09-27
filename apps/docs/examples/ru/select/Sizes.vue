<template>
  <NuiSelect label="Маленький" v-model="value" :options="options" size="sm" />
  <NuiSelect label="Обычный" v-model="value" :options="options" />
  <NuiSelect label="Большой" v-model="value" :options="options" size="lg" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect, type NuiOptionSource } from '@numior/vue';

const value = ref<string | null>('a');

const options: NuiOptionSource<string> = [
  { value: 'a', label: 'Первый' },
  { value: 'b', label: 'Второй' },
];
</script>
