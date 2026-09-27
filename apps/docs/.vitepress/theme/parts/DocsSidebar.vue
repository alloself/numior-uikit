<template>
  <NuiSidebar :label="texts.navigation" collapsible="offcanvas">
    <NuiSidebarContent>
      <NuiSidebarGroup
        v-for="group in theme.sidebar"
        :key="group.text"
        :label="group.text"
        collapsible
        :items="entriesOf(group)"
      />
    </NuiSidebarContent>
  </NuiSidebar>
</template>

<script setup lang="ts">
import { useData, withBase } from 'vitepress';
import { NuiSidebar, NuiSidebarContent, NuiSidebarGroup, type NuiListEntry } from '@numior/vue';
import { useDocs } from '../composables/use-docs';
import type { DocsSidebarGroup, DocsThemeConfig } from '../theme.types';

const { theme } = useData<DocsThemeConfig>();
const { texts, isCurrent } = useDocs();

const entriesOf = (group: DocsSidebarGroup): NuiListEntry<unknown>[] =>
  group.items.map((item) => ({
    key: item.link,
    label: item.text,
    href: withBase(item.link),
    current: isCurrent(item.link),
  }));
</script>
