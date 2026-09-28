<template>
  <div class="w-full h-96 border rounded-lg bg-surface">
    <NuiLayout v-model:open="open" content-as="div" :shortcut="false" class="h-full">
      <template #sidebar>
        <NuiSidebar collapsible="icon" label="Sections">
          <NuiSidebarHeader>
            <strong class="px-2">Numior</strong>
          </NuiSidebarHeader>
          <NuiSidebarContent>
            <NuiSidebarGroup label="Overview">
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
              <NuiSidebarItem label="Anna Titova" icon="user" tooltip="Profile" />
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
            <NuiButton size="sm" variant="outline" tone="neutral">Export</NuiButton>
          </template>
        </NuiAppBar>
      </template>
      <div class="p-6">
        <p>The “{{ titles[active] }}” section.</p>
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
  { key: 'inbox', label: 'Inbox', icon: 'inbox', badge: 3 },
  { key: 'calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'files', label: 'Files', icon: 'folder' },
];

const titles: Record<string, string> = {
  inbox: 'Inbox',
  calendar: 'Calendar',
  files: 'Files',
};

const open = ref(true);
const active = ref('inbox');
</script>
