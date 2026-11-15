<template>
  <div class="w-full h-96 overflow-hidden rounded-lg border">
    <NuiLayout
      v-model:open="open"
      content-as="div"
      header="full"
      sidebar-width="12rem"
      end-width="10rem"
      :shortcut="false"
      class="h-full"
    >
      <template #header>
        <NuiAppBar>
          <template #start>
            <NuiSidebarTrigger />
          </template>
          Store admin
        </NuiAppBar>
      </template>
      <template #sidebar>
        <NuiSidebar label="Shipped orders">
          <NuiSidebarContent>
            <NuiSidebarGroup label="Shipped">
              <NuiSidebarItem
                v-for="entry in shipped"
                :key="entry.id"
                :label="`Order ${entry.id}`"
                :current="active === entry.id"
                @click="active = entry.id"
              />
            </NuiSidebarGroup>
          </NuiSidebarContent>
        </NuiSidebar>
      </template>
      <div ref="article" class="flex h-full flex-col gap-2 overflow-auto p-6" tabindex="0">
        <template v-if="order">
          <h2 class="m-0 text-lg font-semibold">Order {{ order.id }}</h2>
          <h3 id="layout-order-items" class="mb-0 mt-3 text-base font-semibold">Items</h3>
          <p v-for="line in order.lines" :key="line.sku" class="m-0">
            {{ line.name }} × {{ line.quantity }}, {{ money.format(line.price * line.quantity) }}
          </p>
          <h3 id="layout-order-delivery" class="mb-0 mt-3 text-base font-semibold">Delivery</h3>
          <p class="m-0">
            {{ DELIVERIES[order.delivery] }}, {{ order.city }}, to {{ order.customer }}.
          </p>
          <p class="m-0">The courier calls an hour before arriving.</p>
          <h3 id="layout-order-payment" class="mb-0 mt-3 text-base font-semibold">Payment</h3>
          <p class="m-0">{{ PAYMENTS[order.payment] }}, {{ money.format(order.total) }}.</p>
          <p class="m-0">The receipt went to the customer by email.</p>
          <h3 id="layout-order-history" class="mb-0 mt-3 text-base font-semibold">History</h3>
          <p class="m-0">
            Placed on {{ dayFormat.format(new Date(order.date)) }}, handled by {{ order.manager }}.
          </p>
        </template>
      </div>
      <template #end>
        <div class="p-4">
          <NuiToc :items="toc" :root="article" title="On this page" />
        </div>
      </template>
    </NuiLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import {
  NuiAppBar,
  NuiLayout,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarGroup,
  NuiSidebarItem,
  NuiSidebarTrigger,
  NuiToc,
  type NuiTocItem,
} from '@numior/vue';
import { DELIVERIES, PAYMENTS, orders } from '#demo/orders';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const dayFormat = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const toc: readonly NuiTocItem[] = [
  { id: 'layout-order-items', label: 'Items' },
  { id: 'layout-order-delivery', label: 'Delivery' },
  { id: 'layout-order-payment', label: 'Payment' },
  { id: 'layout-order-history', label: 'History' },
];

const shipped = orders.filter((entry) => entry.status === 'shipped');
const article = useTemplateRef<HTMLElement>('article');

const open = ref(true);
const active = ref(20408);

const order = computed(() => shipped.find((entry) => entry.id === active.value));
</script>
