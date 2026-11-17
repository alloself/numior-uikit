<template>
  <NuiButton variant="outline" tone="neutral" @click="open = true">Состав заказа</NuiButton>
  <NuiDrawer v-model:open="open" v-bind="$attrs">
    <ul class="flex flex-col gap-2 text-sm">
      <li v-for="line in lines" :key="line.sku">{{ line.quantity }} × {{ line.name }}</li>
    </ul>
    <template #footer>
      <NuiButton @click="open = false">Готово</NuiButton>
    </template>
  </NuiDrawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDrawer } from '@numior/kit';
import { orders } from '#demo/orders';

const open = ref(false);
const lines = orders.find((order) => order.id === 20403)?.lines ?? [];
</script>
