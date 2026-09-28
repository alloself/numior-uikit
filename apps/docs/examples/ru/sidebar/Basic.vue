<template>
  <div class="w-full h-96 border rounded-lg bg-surface">
    <NuiLayout v-model:open="open" content-as="div" :shortcut="false" class="h-full">
      <template #sidebar>
        <NuiSidebar collapsible="icon" label="Проект">
          <NuiSidebarContent>
            <NuiSidebarGroup label="Работа" collapsible>
              <NuiSidebarItem
                label="Задачи"
                icon="inbox"
                :badge="12"
                :current="active === 'tasks'"
                @click="active = 'tasks'"
              />
              <NuiSidebarItem
                label="Календарь"
                icon="calendar"
                :current="active === 'calendar'"
                @click="active = 'calendar'"
              />
              <NuiSidebarSub
                v-model:open="reports"
                label="Отчёты"
                icon="folder"
                :active="active.startsWith('report')"
              >
                <NuiSidebarItem
                  label="Продажи"
                  :current="active === 'report-sales'"
                  @click="active = 'report-sales'"
                />
                <NuiSidebarItem
                  label="Команда"
                  :current="active === 'report-team'"
                  @click="active = 'report-team'"
                />
              </NuiSidebarSub>
            </NuiSidebarGroup>
            <NuiSidebarGroup label="Справка">
              <NuiSidebarItem label="Документация" icon="file" href="#docs" />
              <NuiSidebarItem label="Архив" icon="folder-open" disabled />
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
        <p>Текущий пункт: {{ active }}</p>
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
