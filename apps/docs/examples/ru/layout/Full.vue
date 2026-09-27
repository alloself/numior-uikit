<template>
  <div class="nui-w-full nui-h-96 nui-border nui-rounded-lg nui-bg-surface">
    <NuiLayout
      v-model:open="open"
      content-as="div"
      :shortcut="false"
      class="nui-h-full"
      header="full"
      end-width="12rem"
    >
      <template #sidebar>
        <NuiSidebar collapsible="icon" label="Разделы">
          <NuiSidebarHeader>
            <strong class="nui-px-2">Numior</strong>
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
      <div class="nui-p-6">
        <p>Раздел «{{ titles[active] }}».</p>
      </div>
      <template #end>
        <nav class="nui-p-4 nui-text-sm" aria-label="На странице">
          <p class="nui-m-0 nui-font-medium">На странице</p>
          <p class="nui-m-0 nui-text-muted">Сводка, задачи, файлы</p>
        </nav>
      </template>
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
