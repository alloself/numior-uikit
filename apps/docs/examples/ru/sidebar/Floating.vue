<template>
  <div class="w-full h-96 overflow-hidden rounded-lg border">
    <NuiLayout v-model:open="open" content-as="div" :shortcut="false" class="h-full">
      <template #sidebar>
        <NuiSidebar collapsible="icon" variant="floating" label="Разделы кабинета">
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
} from '@numior/kit';
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
    label: 'Заказы',
    icon: ShoppingCart,
    summary: 'Два заказа ждут оплаты, три едут к покупателям.',
    badge: 2,
  },
  {
    key: 'products',
    label: 'Товары',
    icon: Package,
    summary: 'Табурет «Лофт» закончился, комодов «Фьорд» осталось четыре.',
  },
  {
    key: 'customers',
    label: 'Клиенты',
    icon: Users,
    summary: 'Пётр Волков оформил 14 заказов, больше всех.',
  },
  {
    key: 'warehouse',
    label: 'Склад',
    icon: Warehouse,
    summary: 'Игорь Белов собирает заказы 20409 и 20410.',
  },
  {
    key: 'reports',
    label: 'Отчёты',
    icon: ChartColumn,
    summary: 'Отчёт по продажам за сентябрь готов.',
  },
];

const [manager] = team;

const open = ref(true);
const active = ref('orders');

const current = computed(
  () => sections.find((section) => section.key === active.value) ?? sections[0],
);
</script>
