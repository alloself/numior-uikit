<template>
  <NuiTabs v-model="tab" class="w-full max-w-md">
    <NuiTabList label="Open documents">
      <NuiTab
        v-for="file in files"
        :key="file.value"
        :value="file.value"
        closable
        @close="close(file.value)"
      >
        {{ file.label }}
      </NuiTab>
    </NuiTabList>
    <NuiTabPanel v-for="file in files" :key="file.value" :value="file.value">
      {{ file.text }}
    </NuiTabPanel>
  </NuiTabs>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';

const files = ref([
  { value: 'contract', label: 'Contract', text: 'Supply contract No. 18 of 2 September.' },
  { value: 'invoice', label: 'Invoice', text: 'Invoice for $1,240, due on Friday.' },
  { value: 'act', label: 'Statement', text: 'Account statement for September, no differences.' },
]);

const tab = ref('contract');

const close = (value: string): void => {
  const index = files.value.findIndex((file) => file.value === value);

  files.value = files.value.filter((file) => file.value !== value);

  if (tab.value !== value) {
    return;
  }

  tab.value = files.value.at(Math.min(index, files.value.length - 1))?.value ?? '';
};
</script>
