<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-4 p-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h1 class="m-0 text-xl font-semibold tracking-tight">Jump to</h1>
        <p class="m-0 text-sm text-muted-foreground">
          Orders, products, and actions in one search box
        </p>
      </div>
      <NuiButton variant="outline" tone="neutral" icon="search" @click="open = true">
        Search <NuiKbd keys="mod+k" size="sm" variant="plain" />
      </NuiButton>
    </div>
    <NuiCommandDialog
      v-model:open="open"
      :items="commands"
      hotkey="mod+k"
      title="Jump to"
      placeholder="Order number, product, or action"
      @select="remember"
    />
    <section class="flex flex-col gap-2">
      <h2 :id="recentId" class="m-0 text-sm font-medium text-muted-foreground">Recent</h2>
      <NuiList variant="outline" :labelled-by="recentId">
        <NuiListItem
          v-for="item in recent"
          :key="item.value"
          :icon="item.icon"
          :label="item.label"
          :description="item.description"
        />
      </NuiList>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue';
import {
  NuiButton,
  NuiCommandDialog,
  NuiKbd,
  NuiList,
  NuiListItem,
  type NuiCommandItem,
  type NuiCommandSource,
} from '@numior/vue';
import { ORDER_STATUSES, orders } from '#demo/orders';
import { products } from '#demo/products';

const RECENT_LIMIT = 5;
const RECENT_ORDERS = 2;
const RECENT_PRODUCTS = 2;

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const orderItems: NuiCommandItem[] = orders.slice(0, 5).map((order) => ({
  value: `order-${order.id}`,
  label: `#${order.id} · ${order.customer}`,
  description: `${ORDER_STATUSES[order.status]} · ${money.format(order.total)}`,
  icon: 'inbox',
  keywords: [order.city],
}));

const productItems: NuiCommandItem[] = products.slice(0, 5).map((product) => ({
  value: `product-${product.sku}`,
  label: product.name,
  description: `${product.sku} · ${money.format(product.price)}`,
  icon: 'image',
}));

const commands: NuiCommandSource = [
  { label: 'Orders', items: orderItems },
  { label: 'Products', items: productItems },
  {
    label: 'Actions',
    items: [
      { value: 'new-order', label: 'Create an order', icon: 'plus', shortcut: 'mod+shift+o' },
      { value: 'new-product', label: 'Add a product', icon: 'plus' },
      { value: 'prices', label: 'Upload prices', icon: 'upload', keywords: ['price list'] },
    ],
  },
];

const recentId = useId();
const open = ref(false);

const recent = ref<NuiCommandItem[]>([
  ...orderItems.slice(0, RECENT_ORDERS),
  ...productItems.slice(0, RECENT_PRODUCTS),
]);

const remember = (item: NuiCommandItem): void => {
  const others = recent.value.filter((entry) => entry.value !== item.value);

  recent.value = [item, ...others].slice(0, RECENT_LIMIT);
};
</script>
