<template>
  <NuiSidebar :label="texts.navigation" collapsible="offcanvas" variant="plain" marker="square">
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
import { computed, onMounted, watch } from 'vue';
import { useCurrentElement } from '@vueuse/core';
import { useData, useRoute, withBase } from 'vitepress';
import {
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarGroup,
  useLayout,
  type NuiListEntry,
} from '@numior/vue';
import { revealCurrent } from '../composables/reveal-current';
import { useDocs } from '../composables/use-docs';
import type { DocsSidebarGroup, DocsThemeConfig } from '../theme.types';

const { theme } = useData<DocsThemeConfig>();
const { texts, sidebar, isCurrent, startsCurrent } = useDocs();
const layout = useLayout();
const route = useRoute();
const root = useCurrentElement<HTMLElement>();

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
    current: item.sections.some(startsCurrent),
  })),
);

const reveal = (): void => {
  revealCurrent(root.value);
};

onMounted(reveal);
watch(() => route.path, reveal, { flush: 'post' });
</script>
