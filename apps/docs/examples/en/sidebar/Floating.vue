<template>
  <div class="w-full h-96 border rounded-lg overflow-hidden">
    <NuiLayout v-model:open="open" content-as="div" :shortcut="false" class="h-full">
      <template #sidebar>
        <NuiSidebar collapsible="icon" variant="floating" label="Project">
          <NuiSidebarHeader>
            <strong class="px-2">Numior</strong>
          </NuiSidebarHeader>
          <NuiSidebarContent>
            <NuiSidebarGroup label="Work">
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
        <p>The sidebar stands off the frame edges with a border and a shadow.</p>
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
  { key: 'tasks', label: 'Tasks', icon: 'inbox', badge: 12 },
  { key: 'calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'files', label: 'Files', icon: 'folder' },
];

const titles: Record<string, string> = {
  tasks: 'Tasks',
  calendar: 'Calendar',
  files: 'Files',
};

const open = ref(true);
const active = ref('tasks');
</script>
