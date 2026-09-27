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
        <NuiSidebar collapsible="icon" label="Sections">
          <NuiSidebarHeader>
            <strong class="nui-px-2">Numior</strong>
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
      <div class="nui-p-6">
        <p>The “{{ titles[active] }}” section.</p>
      </div>
      <template #end>
        <nav class="nui-p-4 nui-text-sm" aria-label="On this page">
          <p class="nui-m-0 nui-font-medium">On this page</p>
          <p class="nui-m-0 nui-text-muted">Summary, tasks, files</p>
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
