<template>
  <NuiCollapsible v-model:open="open" class="w-full max-w-sm">
    <template #trigger="{ open: expanded }">
      {{ expanded ? 'Hide items' : 'Show 3 items' }}
    </template>
    <ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm text-muted-foreground">
      <li v-for="line in lines" :key="line.sku">{{ line.name }} × {{ line.quantity }}</li>
    </ul>
  </NuiCollapsible>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCollapsible } from '@numior/vue';
import { orders } from '#demo/orders';

const lines = orders.find((order) => order.id === 20401)?.lines ?? [];

const open = ref(false);
</script>
