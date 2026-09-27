<template>
  <NuiSidebar :label="texts.navigation" collapsible="offcanvas" variant="plain">
    <NuiSidebarContent>
      <NuiSidebarGroup v-if="layout.mobile.value" :label="texts.sections" :items="sectionEntries" />
      <NuiSidebarGroup
        v-for="group in sidebar"
        :key="group.text"
        :label="group.text"
        :items="entriesOf(group)"
      />
    </NuiSidebarContent>
  </NuiSidebar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useData, withBase } from 'vitepress';
import {
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarGroup,
  useLayout,
  type NuiListEntry,
} from '@numior/vue';
import { useDocs } from '../composables/use-docs';
import type { DocsSidebarGroup, DocsThemeConfig } from '../theme.types';

const { theme } = useData<DocsThemeConfig>();
const { texts, sidebar, isCurrent, startsCurrent } = useDocs();
const layout = useLayout();

const entriesOf = (group: DocsSidebarGroup): NuiListEntry<unknown>[] =>
  group.items.map((item) => ({
    key: item.link,
    label: item.text,
    href: withBase(item.link),
    current: isCurrent(item.link),
  }));

const sectionEntries = computed<NuiListEntry<unknown>[]>(() =>
  theme.value.nav.map((item) => ({
    key: item.link,
    label: item.text,
    href: withBase(item.link),
    current: startsCurrent(item.section),
  })),
);
</script>
