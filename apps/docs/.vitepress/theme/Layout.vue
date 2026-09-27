<template>
  <NuiSkipLink target="docs-content" :label="texts.skip" />
  <NuiLayout header="full" sticky :mobile-query="MOBILE_QUERY" end-width="16rem">
    <template #header>
      <DocsHeader @search="searchOpen = true" />
    </template>
    <template v-if="hasSidebar" #sidebar>
      <DocsSidebar />
    </template>
    <DocsNotFound v-if="page.isNotFound" />
    <DocsHome v-else-if="frontmatter.layout === 'home'" />
    <DocsPage v-else />
    <template v-if="showToc" #end>
      <DocsToc />
    </template>
  </NuiLayout>
  <DocsSearch v-model:open="searchOpen" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useData, useRoute } from 'vitepress';
import { NuiLayout, NuiSkipLink, useMediaQuery } from '@numior/vue';
import { useDocs } from './composables/use-docs';
import DocsHeader from './parts/DocsHeader.vue';
import DocsHome from './parts/DocsHome.vue';
import DocsNotFound from './parts/DocsNotFound.vue';
import DocsPage from './parts/DocsPage.vue';
import DocsSearch from './parts/DocsSearch.vue';
import DocsSidebar from './parts/DocsSidebar.vue';
import DocsToc from './parts/DocsToc.vue';

const MOBILE_QUERY = '(max-width: 64rem)';

const { page, frontmatter } = useData();
const route = useRoute();
const { texts, sidebar } = useDocs();

const mobile = useMediaQuery(MOBILE_QUERY);
const hasSidebar = computed(() => sidebar.value.length > 0 || mobile.value);
const searchOpen = ref(false);

const showToc = computed(
  () =>
    !page.value.isNotFound &&
    frontmatter.value.layout !== 'home' &&
    page.value.headers.some((header) => header.level === 2),
);

watch(
  () => route.path,
  () => {
    searchOpen.value = false;
  },
);
</script>
