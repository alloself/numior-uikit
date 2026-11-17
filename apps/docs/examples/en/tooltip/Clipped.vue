<template>
  <NuiTooltip :anchor="CLIPPED">
    <template #trigger="{ attrs }">
      <ul v-bind="attrs" class="flex w-28 flex-col gap-1 text-sm">
        <li v-for="product in shown" :key="product.sku" class="truncate">{{ product.name }}</li>
      </ul>
    </template>
    <template #default="{ target }">{{ target?.textContent }}</template>
  </NuiTooltip>
</template>

<script setup lang="ts">
import { NuiTooltip, type NuiTooltipTargets } from '@numior/kit';
import { products } from '#demo/products';

const CLIPPED: NuiTooltipTargets = {
  selector: 'li',
  when: (item) => item.scrollWidth > item.clientWidth,
};

const shown = products.slice(0, 5);
</script>
