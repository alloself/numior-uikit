<template>
  <NuiTabs v-model="tab" class="nui-w-full nui-max-w-md">
    <NuiTabList label="Разделы заказа">
      <NuiTab value="items">Состав</NuiTab>
      <NuiTab value="delivery">Доставка</NuiTab>
      <NuiTab value="history" disabled>История</NuiTab>
    </NuiTabList>
    <NuiTabPanel value="items">Три позиции на 12 400 ₽.</NuiTabPanel>
    <NuiTabPanel value="delivery">Курьером завтра, 12:00–16:00.</NuiTabPanel>
    <NuiTabPanel value="history">История пока пуста.</NuiTabPanel>
  </NuiTabs>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';

const tab = ref('items');
</script>
