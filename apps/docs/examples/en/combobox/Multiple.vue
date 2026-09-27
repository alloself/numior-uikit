<template>
  <NuiCombobox
    v-model:values="tags"
    :options="options"
    :custom-value="(text) => text"
    label="Task tags"
    description="Enter adds your own tag"
    multiple
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCombobox, type NuiOptionSource } from '@numior/vue';

const tags = ref(['frontend']);

const options: NuiOptionSource<string> = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'design', label: 'Design' },
  { value: 'urgent', label: 'Urgent' },
];
</script>
