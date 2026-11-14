<template>
  <NuiTabs v-if="opened.length > 0" v-model="tab" class="w-full max-w-md">
    <NuiTabList label="Открытые заказы">
      <NuiTab
        v-for="order in opened"
        :key="order.id"
        :value="String(order.id)"
        closable
        @close="close(order.id)"
      >
        Заказ {{ order.id }}
      </NuiTab>
    </NuiTabList>
    <NuiTabPanel v-for="order in opened" :key="order.id" :value="String(order.id)">
      {{ order.customer }}, {{ order.city }}, {{ money.format(order.total) }}.
    </NuiTabPanel>
  </NuiTabs>
  <NuiButton v-else variant="outline" tone="neutral" @click="reopen"
    >Открыть заказы снова</NuiButton
  >
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';
import { orders } from '#demo/orders';

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const shipped = orders.filter((order) => order.status === 'shipped');
const first = String(shipped[0]?.id ?? '');

const opened = ref([...shipped]);
const tab = ref(first);

const close = (id: number): void => {
  const index = opened.value.findIndex((order) => order.id === id);

  opened.value = opened.value.filter((order) => order.id !== id);

  if (tab.value !== String(id)) {
    return;
  }

  tab.value = String(opened.value.at(Math.min(index, opened.value.length - 1))?.id ?? '');
};

const reopen = (): void => {
  opened.value = [...shipped];
  tab.value = first;
};
</script>
