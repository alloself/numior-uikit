<template>
  <div class="w-full h-80 border rounded-lg bg-surface">
    <NuiLayout content-as="div" :shortcut="false" class="h-full">
      <template #sidebar>
        <NuiSidebar collapsible="none" variant="plain" marker="square" label="Кабинет магазина">
          <NuiSidebarContent>
            <NuiSidebarGroup label="Продажи">
              <NuiSidebarItem
                v-for="item in sales"
                :key="item"
                :label="item"
                :current="active === item"
                @click="active = item"
              />
            </NuiSidebarGroup>
            <NuiSidebarGroup label="Каталог">
              <NuiSidebarItem
                v-for="item in catalog"
                :key="item"
                :label="item"
                :current="active === item"
                @click="active = item"
              />
            </NuiSidebarGroup>
          </NuiSidebarContent>
        </NuiSidebar>
      </template>
      <div class="p-6">
        <h3 class="m-0 text-lg font-semibold">{{ active }}</h3>
      </div>
    </NuiLayout>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiLayout,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarGroup,
  NuiSidebarItem,
} from '@numior/vue';

const sales = ['Заказы', 'Клиенты', 'Оплаты'];
const catalog = ['Товары', 'Склад'];
const active = ref('Заказы');
</script>
