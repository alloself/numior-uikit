<template>
  <div class="w-full h-96 border rounded-lg bg-surface">
    <NuiLayout v-model:open="open" content-as="div" :shortcut="false" class="h-full">
      <template #sidebar>
        <NuiSidebar collapsible="icon" label="Разделы">
          <NuiSidebarHeader>
            <strong class="px-2">Numior</strong>
          </NuiSidebarHeader>
          <NuiSidebarContent>
            <NuiSidebarGroup label="Обзор">
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
          <NuiSidebarFooter>
            <NuiSidebarGroup>
              <NuiSidebarItem label="Анна Титова" icon="user" tooltip="Профиль" />
            </NuiSidebarGroup>
          </NuiSidebarFooter>
        </NuiSidebar>
      </template>
      <template #header>
        <NuiAppBar>
          <template #start>
            <NuiSidebarTrigger />
          </template>
          {{ titles[active] }}
          <template #end>
            <NuiButton size="sm" variant="outline" tone="neutral">Экспорт</NuiButton>
          </template>
        </NuiAppBar>
      </template>
      <div class="p-6">
        <p>Раздел «{{ titles[active] }}».</p>
      </div>
    </NuiLayout>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiAppBar,
  NuiButton,
  NuiLayout,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarFooter,
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
  { key: 'inbox', label: 'Входящие', icon: 'inbox', badge: 3 },
  { key: 'calendar', label: 'Календарь', icon: 'calendar' },
  { key: 'files', label: 'Файлы', icon: 'folder' },
];

const titles: Record<string, string> = {
  inbox: 'Входящие',
  calendar: 'Календарь',
  files: 'Файлы',
};

const open = ref(true);
const active = ref('inbox');
</script>
