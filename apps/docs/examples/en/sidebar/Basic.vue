<template>
  <div class="w-full h-96 border rounded-lg bg-surface">
    <NuiLayout v-model:open="open" content-as="div" :shortcut="false" class="h-full">
      <template #sidebar>
        <NuiSidebar collapsible="icon" label="Project">
          <NuiSidebarContent>
            <NuiSidebarGroup label="Work" collapsible>
              <NuiSidebarItem
                label="Tasks"
                icon="inbox"
                :badge="12"
                :current="active === 'tasks'"
                @click="active = 'tasks'"
              />
              <NuiSidebarItem
                label="Calendar"
                icon="calendar"
                :current="active === 'calendar'"
                @click="active = 'calendar'"
              />
              <NuiSidebarSub
                v-model:open="reports"
                label="Reports"
                icon="folder"
                :active="active.startsWith('report')"
              >
                <NuiSidebarItem
                  label="Sales"
                  :current="active === 'report-sales'"
                  @click="active = 'report-sales'"
                />
                <NuiSidebarItem
                  label="Team"
                  :current="active === 'report-team'"
                  @click="active = 'report-team'"
                />
              </NuiSidebarSub>
            </NuiSidebarGroup>
            <NuiSidebarGroup label="Help">
              <NuiSidebarItem label="Documentation" icon="file" href="#docs" />
              <NuiSidebarItem label="Archive" icon="folder-open" disabled />
            </NuiSidebarGroup>
          </NuiSidebarContent>
        </NuiSidebar>
      </template>
      <template #header>
        <NuiAppBar>
          <template #start>
            <NuiSidebarTrigger />
          </template>
          {{ active }}
        </NuiAppBar>
      </template>
      <div class="p-6">
        <p>Current item: {{ active }}</p>
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
  NuiSidebarItem,
  NuiSidebarSub,
  NuiSidebarTrigger,
} from '@numior/vue';

const open = ref(true);
const reports = ref(true);
const active = ref('tasks');
</script>
