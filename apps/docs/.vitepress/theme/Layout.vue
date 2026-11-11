<template>
  <BlockScreen v-if="bare" />
  <template v-else>
    <div class="grid min-h-dvh grid-cols-[minmax(0,1fr)]">
      <NuiLayout
        id="docs-layout"
        header="full"
        sticky
        :mobile-query="MOBILE_QUERY"
        end-width="16rem"
        :skip-label="texts.skip"
      >
        <template #header>
          <DocsHeader @search="searchOpen = true" />
        </template>
        <template v-if="hasSidebar" #sidebar>
          <DocsSidebar />
        </template>
        <DocsNotFound v-if="page.isNotFound" @search="searchOpen = true" />
        <DocsHome v-else-if="frontmatter.layout === 'home'" />
        <DocsPage v-else />
        <template v-if="showToc" #end>
          <DocsToc />
        </template>
        <template #footer>
          <DocsFooter />
        </template>
      </NuiLayout>
    </div>
    <DocsSearch v-model:open="searchOpen" />
    <NuiToaster />
  </template>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useData, useRoute } from 'vitepress';
import { NuiLayout, NuiToaster, useMediaQuery } from '@numior/vue';
import { useDocs } from './composables/use-docs';
import BlockScreen from './parts/BlockScreen.vue';
import DocsFooter from './parts/DocsFooter.vue';
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
const bare = computed(() => frontmatter.value.layout === 'block');

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
