<template>
  <NuiSidebar :label="texts.navigation" collapsible="offcanvas" variant="plain">
    <NuiSidebarContent>
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
import { withBase } from 'vitepress';
import { NuiSidebar, NuiSidebarContent, NuiSidebarGroup, type NuiListEntry } from '@numior/vue';
import { useDocs } from '../composables/use-docs';
import type { DocsSidebarGroup } from '../theme.types';

const { texts, sidebar, isCurrent } = useDocs();

const entriesOf = (group: DocsSidebarGroup): NuiListEntry<unknown>[] =>
  group.items.map((item) => ({
    key: item.link,
    label: item.text,
    href: withBase(item.link),
    current: isCurrent(item.link),
  }));
</script>
