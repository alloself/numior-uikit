<template>
  <div class="w-full h-96 overflow-hidden rounded-lg border">
    <NuiLayout v-model:open="open" content-as="div" :shortcut="false" class="h-full">
      <template #sidebar>
        <NuiSidebar collapsible="offcanvas" variant="plain" label="Разделы кабинета">
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
    label: 'Заказы',
    summary: 'Два заказа ждут оплаты, три едут к покупателям.',
  },
  customers: {
    label: 'Клиенты',
    summary: 'Пётр Волков оформил 14 заказов, больше всех.',
  },
  reports: {
    label: 'Отчёты',
    summary: 'Отчёт по продажам за сентябрь готов.',
  },
  products: {
    label: 'Товары',
    summary: 'Табурет «Лофт» закончился, комодов «Фьорд» осталось четыре.',
  },
  warehouse: {
    label: 'Склад',
    summary: 'Игорь Белов собирает заказы 20409 и 20410.',
  },
};

const groups: readonly Group[] = [
  { label: 'Продажи', pages: ['orders', 'customers', 'reports'] },
  { label: 'Каталог', pages: ['products', 'warehouse'] },
];

const open = ref(true);
const active = ref<PageKey>('orders');
</script>
