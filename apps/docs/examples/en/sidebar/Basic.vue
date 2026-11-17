<template>
  <div class="w-full h-96 overflow-hidden rounded-lg border">
    <NuiLayout v-model:open="open" content-as="div" :shortcut="false" class="h-full">
      <template #sidebar>
        <NuiSidebar collapsible="icon" label="Store sections">
          <NuiSidebarContent>
            <NuiSidebarGroup label="Sales">
              <NuiSidebarSub
                label="Orders"
                :icon="ShoppingCart"
                :active="active.startsWith('orders')"
              >
                <NuiSidebarItem
                  v-for="key in orderPages"
                  :key="key"
                  :label="pages[key].label"
                  :badge="pages[key].badge"
                  :current="active === key"
                  @click="active = key"
                />
              </NuiSidebarSub>
              <NuiSidebarItem
                label="Customers"
                :icon="Users"
                :current="active === 'customers'"
                @click="active = 'customers'"
              />
            </NuiSidebarGroup>
            <NuiSidebarGroup label="Catalog">
              <NuiSidebarItem
                label="Products"
                :icon="Package"
                :current="active === 'products'"
                @click="active = 'products'"
              />
              <NuiSidebarItem
                label="Warehouse"
                :icon="Warehouse"
                :current="active === 'warehouse'"
                @click="active = 'warehouse'"
              />
            </NuiSidebarGroup>
          </NuiSidebarContent>
          <NuiSidebarFooter>
            <NuiSidebarGroup>
              <NuiSidebarItem :label="manager.name" icon="user" />
            </NuiSidebarGroup>
          </NuiSidebarFooter>
        </NuiSidebar>
      </template>
      <template #header>
        <NuiAppBar>
          <template #start>
            <NuiSidebarTrigger />
          </template>
          {{ pages[active].label }}
        </NuiAppBar>
      </template>
      <p class="m-0 px-(--nui-layout-gutter) py-6">{{ pages[active].summary }}</p>
    </NuiLayout>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Package, ShoppingCart, Users, Warehouse } from '@lucide/vue';
import {
  NuiAppBar,
  NuiLayout,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarFooter,
  NuiSidebarGroup,
  NuiSidebarItem,
  NuiSidebarSub,
  NuiSidebarTrigger,
} from '@numior/kit';
import { team } from '#demo/team';

type PageKey =
  | 'orders-new'
  | 'orders-ship'
  | 'orders-returns'
  | 'customers'
  | 'products'
  | 'warehouse';

interface Page {
  readonly label: string;
  readonly summary: string;
  readonly badge?: number;
}

const pages: Readonly<Record<PageKey, Page>> = {
  'orders-new': {
    label: 'New',
    summary: 'Orders 20411 and 20412 await payment.',
    badge: 2,
  },
  'orders-ship': {
    label: 'To ship',
    summary: 'Orders 20409 and 20410 are paid and wait to be packed.',
    badge: 2,
  },
  'orders-returns': {
    label: 'Returns',
    summary: 'There are no return requests.',
  },
  customers: {
    label: 'Customers',
    summary: 'Peter Wolfe has placed 14 orders, more than anyone else.',
  },
  products: {
    label: 'Products',
    summary: 'Loft stools are sold out, and only four Fjord dressers are left.',
  },
  warehouse: {
    label: 'Warehouse',
    summary: 'Ian Bell is packing orders 20409 and 20410.',
  },
};

const orderPages: readonly PageKey[] = ['orders-new', 'orders-ship', 'orders-returns'];
const [manager] = team;

const open = ref(true);
const active = ref<PageKey>('orders-new');
</script>
