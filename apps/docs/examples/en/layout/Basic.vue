<template>
  <div class="w-full h-96 overflow-hidden rounded-lg border">
    <NuiLayout v-model:open="open" content-as="div" :shortcut="false" class="h-full">
      <template #sidebar>
        <NuiSidebar collapsible="icon" label="Store sections">
          <NuiSidebarContent>
            <NuiSidebarGroup>
              <NuiSidebarItem
                v-for="section in sections"
                :key="section.key"
                :label="section.label"
                :icon="section.icon"
                :badge="section.badge"
                :current="active === section.key"
                @click="active = section.key"
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
          {{ current.label }}
        </NuiAppBar>
      </template>
      <p class="m-0 px-(--nui-layout-gutter) py-6">{{ current.summary }}</p>
    </NuiLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue';
import { ChartColumn, Package, ShoppingCart, Users, Warehouse } from '@lucide/vue';
import {
  NuiAppBar,
  NuiLayout,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarFooter,
  NuiSidebarGroup,
  NuiSidebarItem,
  NuiSidebarTrigger,
} from '@numior/vue';
import { team } from '#demo/team';

interface Section {
  readonly key: string;
  readonly label: string;
  readonly icon: Component;
  readonly summary: string;
  readonly badge?: number;
}

const sections: readonly [Section, ...Section[]] = [
  {
    key: 'orders',
    label: 'Orders',
    icon: ShoppingCart,
    summary: 'Two orders await payment, and three are on their way.',
    badge: 2,
  },
  {
    key: 'products',
    label: 'Products',
    icon: Package,
    summary: 'Loft stools are sold out, and only four Fjord dressers are left.',
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: Users,
    summary: 'Peter Wolfe has placed 14 orders, more than anyone else.',
  },
  {
    key: 'warehouse',
    label: 'Warehouse',
    icon: Warehouse,
    summary: 'Ian Bell is packing orders 20409 and 20410.',
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: ChartColumn,
    summary: 'The sales report for September is ready.',
  },
];

const [manager] = team;

const open = ref(true);
const active = ref('orders');

const current = computed(
  () => sections.find((section) => section.key === active.value) ?? sections[0],
);
</script>
