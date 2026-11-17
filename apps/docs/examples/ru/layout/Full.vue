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
          Кабинет магазина
        </NuiAppBar>
      </template>
      <template #sidebar>
        <NuiSidebar label="Заказы в доставке">
          <NuiSidebarContent>
            <NuiSidebarGroup label="В доставке">
              <NuiSidebarItem
                v-for="entry in shipped"
                :key="entry.id"
                :label="`Заказ ${entry.id}`"
                :current="active === entry.id"
                @click="active = entry.id"
              />
            </NuiSidebarGroup>
          </NuiSidebarContent>
        </NuiSidebar>
      </template>
      <div ref="article" class="flex h-full flex-col gap-2 overflow-auto p-6" tabindex="0">
        <template v-if="order">
          <h2 class="m-0 text-lg font-semibold">Заказ {{ order.id }}</h2>
          <h3 id="layout-order-items" class="mb-0 mt-3 text-base font-semibold">Состав</h3>
          <p v-for="line in order.lines" :key="line.sku" class="m-0">
            {{ line.name }} × {{ line.quantity }}, {{ money.format(line.price * line.quantity) }}
          </p>
          <h3 id="layout-order-delivery" class="mb-0 mt-3 text-base font-semibold">Доставка</h3>
          <p class="m-0">
            {{ DELIVERIES[order.delivery] }}, {{ order.city }}, получит {{ order.customer }}.
          </p>
          <p class="m-0">Курьер позвонит за час до приезда.</p>
          <h3 id="layout-order-payment" class="mb-0 mt-3 text-base font-semibold">Оплата</h3>
          <p class="m-0">{{ PAYMENTS[order.payment] }}, {{ money.format(order.total) }}.</p>
          <p class="m-0">Чек отправлен покупателю на почту.</p>
          <h3 id="layout-order-history" class="mb-0 mt-3 text-base font-semibold">История</h3>
          <p class="m-0">
            Оформлен {{ dayFormat.format(new Date(order.date)) }}, заказ ведёт {{ order.manager }}.
          </p>
        </template>
      </div>
      <template #end>
        <div class="p-4">
          <NuiToc :items="toc" :root="article" title="На странице" />
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
} from '@numior/kit';
import { DELIVERIES, PAYMENTS, orders } from '#demo/orders';

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const dayFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const toc: readonly NuiTocItem[] = [
  { id: 'layout-order-items', label: 'Состав' },
  { id: 'layout-order-delivery', label: 'Доставка' },
  { id: 'layout-order-payment', label: 'Оплата' },
  { id: 'layout-order-history', label: 'История' },
];

const shipped = orders.filter((entry) => entry.status === 'shipped');
const article = useTemplateRef<HTMLElement>('article');

const open = ref(true);
const active = ref(20408);

const order = computed(() => shipped.find((entry) => entry.id === active.value));
</script>
