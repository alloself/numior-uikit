<template>
  <div class="w-full h-96 overflow-hidden rounded-lg border">
    <NuiLayout v-model:open="open" content-as="div" :shortcut="false" class="h-full">
      <template #sidebar>
        <NuiSidebar collapsible="offcanvas" variant="plain" label="Store sections">
          <NuiSidebarContent>
            <NuiSidebarGroup v-for="group in groups" :key="group.label" :label="group.label">
              <NuiSidebarItem
                v-for="key in group.pages"
                :key="key"
                :label="pages[key].label"
                :current="active === key"
                @click="active = key"
              />
            </NuiSidebarGroup>
          </NuiSidebarContent>
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
      <p class="m-0 p-6">{{ pages[active].summary }}</p>
    </NuiLayout>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiAppBar,
  NuiLayout,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarGroup,
  NuiSidebarItem,
  NuiSidebarTrigger,
} from '@numior/vue';

type PageKey = 'orders' | 'customers' | 'reports' | 'products' | 'warehouse';

interface Page {
  readonly label: string;
  readonly summary: string;
}

interface Group {
  readonly label: string;
  readonly pages: readonly PageKey[];
}

const pages: Readonly<Record<PageKey, Page>> = {
  orders: {
    label: 'Orders',
    summary: 'Two orders await payment, and three are on their way.',
  },
  customers: {
    label: 'Customers',
    summary: 'Peter Wolfe has placed 14 orders, more than anyone else.',
  },
  reports: {
    label: 'Reports',
    summary: 'The sales report for September is ready.',
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

const groups: readonly Group[] = [
  { label: 'Sales', pages: ['orders', 'customers', 'reports'] },
  { label: 'Catalog', pages: ['products', 'warehouse'] },
];

const open = ref(true);
const active = ref<PageKey>('orders');
</script>
