<template>
  <NuiTabs id="settings" model-value="team" :tabs="TABS">
    <template #panel="{ tab }">{{ tab.label }} panel</template>
  </NuiTabs>
</template>

<script setup lang="ts">
import { NuiTabs } from '../../../src';

const TABS = [
  { value: 'general', label: 'General' },
  { value: 'team', label: 'Team' },
];
</script>
