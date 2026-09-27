<template>
  <NuiTabs v-model="tab" class="nui-w-full nui-max-w-md">
    <NuiTabList label="Order sections">
      <NuiTab value="items">Items</NuiTab>
      <NuiTab value="delivery">Delivery</NuiTab>
      <NuiTab value="history" disabled>History</NuiTab>
    </NuiTabList>
    <NuiTabPanel value="items">Three items for €124.</NuiTabPanel>
    <NuiTabPanel value="delivery">Courier tomorrow, 12:00–16:00.</NuiTabPanel>
    <NuiTabPanel value="history">The history is empty so far.</NuiTabPanel>
  </NuiTabs>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';

const tab = ref('items');
</script>
