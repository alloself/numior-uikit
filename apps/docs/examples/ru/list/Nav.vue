<template>
  <NuiList variant="nav" label="Разделы кабинета" class="w-full max-w-60">
    <NuiListItem
      :icon="ShoppingCart"
      label="Заказы"
      :badge="2"
      :current="section === 'orders'"
      interactive
      @click="section = 'orders'"
    />
    <NuiListItem
      :icon="Package"
      label="Товары"
      :current="section === 'products'"
      interactive
      @click="section = 'products'"
    />
    <NuiListItem
      :icon="Users"
      label="Клиенты"
      :current="section === 'customers'"
      interactive
      @click="section = 'customers'"
    />
    <NuiListItem
      :icon="Warehouse"
      label="Склад"
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
import { NuiList, NuiListItem } from '@numior/vue';

const section = ref('orders');
</script>
