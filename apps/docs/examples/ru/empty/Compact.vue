<template>
  <NuiEmpty
    size="sm"
    icon="search"
    title="Ничего не нашлось"
    description="По запросу «кресло-качалка» товаров нет."
  />
  <NuiEmpty size="sm" :icon="ShoppingCart" title="Корзина пуста" />
</template>

<script setup lang="ts">
import { ShoppingCart } from '@lucide/vue';
import { NuiEmpty } from '@numior/kit';
</script>
