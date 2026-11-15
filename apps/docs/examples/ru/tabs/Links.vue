<template>
  <NuiTabs v-model="page" :links="pages" label="Разделы кабинета" class="w-full max-w-md" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTabs, type NuiTabLinkDescriptor } from '@numior/vue';

const page = ref('#tabs-orders');

const pages: NuiTabLinkDescriptor[] = [
  { to: '#tabs-orders', label: 'Заказы' },
  { to: '#tabs-customers', label: 'Покупатели' },
  { to: '#tabs-products', label: 'Товары' },
  { to: '#tabs-reports', label: 'Отчёты', disabled: true },
];
</script>
