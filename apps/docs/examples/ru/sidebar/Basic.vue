<template>
  <div class="w-full h-96 overflow-hidden rounded-lg border">
    <NuiLayout v-model:open="open" content-as="div" :shortcut="false" class="h-full">
      <template #sidebar>
        <NuiSidebar collapsible="icon" label="Разделы кабинета">
          <NuiSidebarContent>
            <NuiSidebarGroup label="Продажи">
              <NuiSidebarSub
                label="Заказы"
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
                label="Клиенты"
                :icon="Users"
                :current="active === 'customers'"
                @click="active = 'customers'"
              />
            </NuiSidebarGroup>
            <NuiSidebarGroup label="Каталог">
              <NuiSidebarItem
                label="Товары"
                :icon="Package"
                :current="active === 'products'"
                @click="active = 'products'"
              />
              <NuiSidebarItem
                label="Склад"
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
    label: 'Новые',
    summary: 'Заказы 20411 и 20412 ждут оплаты.',
    badge: 2,
  },
  'orders-ship': {
    label: 'К отправке',
    summary: 'Заказы 20409 и 20410 оплачены и ждут сборки.',
    badge: 2,
  },
  'orders-returns': {
    label: 'Возвраты',
    summary: 'Заявок на возврат нет.',
  },
  customers: {
    label: 'Клиенты',
    summary: 'Пётр Волков оформил 14 заказов, больше всех.',
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

const orderPages: readonly PageKey[] = ['orders-new', 'orders-ship', 'orders-returns'];
const [manager] = team;

const open = ref(true);
const active = ref<PageKey>('orders-new');
</script>
