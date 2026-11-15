<template>
  <div class="flex flex-col gap-3 w-full max-w-sm">
    <div class="flex items-center justify-between gap-3 text-sm">
      <span>Order 20411, Nina Hart</span>
      <NuiMenu :items="entries" placement="bottom-end" label="Actions for order 20411">
        <template #trigger="{ attrs }">
          <NuiButton
            v-bind="attrs"
            variant="ghost"
            tone="neutral"
            icon="ellipsis"
            aria-label="Actions for order 20411"
          />
        </template>
      </NuiMenu>
    </div>
    <p class="m-0 text-sm text-muted-foreground">{{ status }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiMenu, type NuiMenuEntry } from '@numior/vue';

const status = ref('The order is awaiting payment.');

const entries: NuiMenuEntry[] = [
  { label: 'Open order', icon: 'eye', href: '#order-20411' },
  {
    label: 'Send payment reminder',
    icon: 'inbox',
    onSelect: () => {
      status.value = 'The payment reminder went to the customer.';
    },
  },
  { type: 'separator' },
  {
    label: 'Cancel order',
    icon: 'trash',
    tone: 'error',
    onSelect: () => {
      status.value = 'Order 20411 is canceled.';
    },
  },
];
</script>
