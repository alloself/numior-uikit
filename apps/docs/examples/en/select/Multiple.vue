<template>
  <NuiSelect label="Tags" v-model:values="tags" :options="options" multiple clearable />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect, type NuiOptionSource } from '@numior/vue';

const tags = ref(['frontend']);

const options: NuiOptionSource<string> = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'design', label: 'Design' },
];
</script>
