<template>
  <NuiField label="Tags">
    <NuiSelect v-model:values="tags" :options="options" multiple clearable />
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiSelect, type NuiOptionSource } from '@numior/vue';

const tags = ref(['frontend']);

const options: NuiOptionSource<string> = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'design', label: 'Design' },
];
</script>
