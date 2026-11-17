<template>
  <NuiTabs v-model="tab" class="w-full max-w-md">
    <NuiTabList label="Заказ 20408">
      <NuiTab value="items">Состав</NuiTab>
      <NuiTab value="delivery">Доставка</NuiTab>
      <NuiTab value="history">История</NuiTab>
    </NuiTabList>
    <NuiTabPanel value="items">Комод «Фьорд» и лампа «Нурд» на 26&nbsp;800&nbsp;₽.</NuiTabPanel>
    <NuiTabPanel value="delivery">Курьером по Москве 25 сентября, с 12:00 до 16:00.</NuiTabPanel>
    <NuiTabPanel value="history"
      >Оформлен 23 сентября, оплачен картой, передан курьеру.</NuiTabPanel
    >
  </NuiTabs>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/kit';

const tab = ref('items');
</script>
