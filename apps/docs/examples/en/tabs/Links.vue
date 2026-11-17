<template>
  <NuiTabs v-model="page" :links="pages" label="Store sections" class="w-full max-w-md" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTabs, type NuiTabLinkDescriptor } from '@numior/kit';

const page = ref('#tabs-orders');

const pages: NuiTabLinkDescriptor[] = [
  { to: '#tabs-orders', label: 'Orders' },
  { to: '#tabs-customers', label: 'Customers' },
  { to: '#tabs-products', label: 'Products' },
  { to: '#tabs-reports', label: 'Reports', disabled: true },
];
</script>
