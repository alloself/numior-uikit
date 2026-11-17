<template>
  <NuiList variant="nav" label="Store sections" class="w-full max-w-60">
    <NuiListItem
      :icon="ShoppingCart"
      label="Orders"
      :badge="2"
      :current="section === 'orders'"
      interactive
      @click="section = 'orders'"
    />
    <NuiListItem
      :icon="Package"
      label="Products"
      :current="section === 'products'"
      interactive
      @click="section = 'products'"
    />
    <NuiListItem
      :icon="Users"
      label="Customers"
      :current="section === 'customers'"
      interactive
      @click="section = 'customers'"
    />
    <NuiListItem
      :icon="Warehouse"
      label="Stock"
      shortcut="mod+shift+s"
      :current="section === 'stock'"
      interactive
      @click="section = 'stock'"
    />
  </NuiList>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Package, ShoppingCart, Users, Warehouse } from '@lucide/vue';
import { NuiList, NuiListItem } from '@numior/kit';

const section = ref('orders');
</script>
