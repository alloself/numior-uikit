<template>
  <div class="w-full h-96 border rounded-lg overflow-hidden">
    <NuiLayout v-model:open="open" content-as="div" :shortcut="false" class="h-full">
      <template #sidebar>
        <NuiSidebar collapsible="icon" variant="inset" label="Проект">
          <NuiSidebarHeader>
            <strong class="px-2">Numior</strong>
          </NuiSidebarHeader>
          <NuiSidebarContent>
            <NuiSidebarGroup label="Работа">
              <NuiSidebarItem
                v-for="item in items"
                :key="item.key"
                :label="item.label"
                :icon="item.icon"
                :badge="item.badge"
                :current="active === item.key"
                @click="active = item.key"
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
          {{ titles[active] }}
        </NuiAppBar>
      </template>
      <div class="p-6">
        <p>Содержимое лежит в приподнятой карточке на приглушённом фоне.</p>
      </div>
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
  NuiSidebarHeader,
  NuiSidebarItem,
  NuiSidebarTrigger,
  type IconAlias,
} from '@numior/vue';

interface Item {
  readonly key: string;
  readonly label: string;
  readonly icon: IconAlias;
  readonly badge?: number;
}

const items: Item[] = [
  { key: 'tasks', label: 'Задачи', icon: 'inbox', badge: 12 },
  { key: 'calendar', label: 'Календарь', icon: 'calendar' },
  { key: 'files', label: 'Файлы', icon: 'folder' },
];

const titles: Record<string, string> = {
  tasks: 'Задачи',
  calendar: 'Календарь',
  files: 'Файлы',
};

const open = ref(true);
const active = ref('tasks');
</script>
