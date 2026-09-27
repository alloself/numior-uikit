<template>
  <NuiSelect label="Small" v-model="value" :options="options" size="sm" />
  <NuiSelect label="Regular" v-model="value" :options="options" />
  <NuiSelect label="Large" v-model="value" :options="options" size="lg" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect, type NuiOptionSource } from '@numior/vue';

const value = ref<string | null>('a');

const options: NuiOptionSource<string> = [
  { value: 'a', label: 'First' },
  { value: 'b', label: 'Second' },
];
</script>
