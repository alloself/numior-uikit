<template>
  <NuiTabs v-model="tab" class="w-full max-w-md">
    <NuiTabList label="Order 20408">
      <NuiTab value="items">Items</NuiTab>
      <NuiTab value="delivery">Delivery</NuiTab>
      <NuiTab value="history">History</NuiTab>
    </NuiTabList>
    <NuiTabPanel value="items">Fjord dresser and Nord table lamp for $368.</NuiTabPanel>
    <NuiTabPanel value="delivery">By courier in Boston on September 25, noon to 4 PM.</NuiTabPanel>
    <NuiTabPanel value="history"
      >Placed on September 23, paid by card, handed to the courier.</NuiTabPanel
    >
  </NuiTabs>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';

const tab = ref('items');
</script>
