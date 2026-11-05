<template>
  <NuiTabs v-model="page" :links="pages" label="Project sections" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTabs, type NuiTabLinkDescriptor } from '@numior/vue';

const page = ref('#tabs-summary');

const pages: NuiTabLinkDescriptor[] = [
  { to: '#tabs-summary', label: 'Summary' },
  { to: '#tabs-tasks', label: 'Tasks' },
  { to: '#tabs-files', label: 'Files' },
  { to: '#tabs-access', label: 'Access', disabled: true },
];
</script>
