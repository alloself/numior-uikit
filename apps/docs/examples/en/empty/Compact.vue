<template>
  <NuiEmpty
    size="sm"
    icon="search"
    title="No results"
    description="No products match “rocking chair”."
  />
  <NuiEmpty size="sm" :icon="ShoppingCart" title="The cart is empty" />
</template>

<script setup lang="ts">
import { ShoppingCart } from '@lucide/vue';
import { NuiEmpty } from '@numior/vue';
</script>
