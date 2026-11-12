<template>
  <NuiCommandDialog
    v-model:open="open"
    v-model:query="query"
    :items="items"
    :filter="false"
    :loading="loading"
    :title="texts.search"
    :label="texts.search"
    :placeholder="texts.searchPlaceholder"
    :empty-label="texts.searchEmpty"
    @select="go"
  >
    <template #item="{ item }">
      <SearchSnippet
        :label="item.label"
        :parts="snippets.get(item.value)"
        :section="sectionOf(item.value, sections)"
      />
    </template>
  </NuiCommandDialog>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { useData, useRouter } from 'vitepress';
import localSearchIndex from '@localSearchIndex';
import { NuiCommandDialog, type NuiCommandItem } from '@numior/vue';
import { useDocs } from '../composables/use-docs';
import {
  loadSearchIndex,
  namedSections,
  pageItems,
  searchHits,
  searchItems,
  sectionOf,
  snippetsOf,
  type SearchHit,
  type SearchIndex,
  type SearchSection,
} from '../search-index';
import type { DocsThemeConfig } from '../theme.types';
import SearchSnippet from './SearchSnippet.vue';

const open = defineModel<boolean>('open', { default: false });

const { localeIndex, theme } = useData<DocsThemeConfig>();
const router = useRouter();
const { texts, allLinks } = useDocs();
const query = ref('');
const loading = ref(false);
const index = shallowRef<SearchIndex | null>(null);
const loadedFor = ref<string | null>(null);

const loadIndex = async (): Promise<void> => {
  const key = localeIndex.value;

  if (loadedFor.value === key) {
    return;
  }
  loading.value = true;
  index.value = await loadSearchIndex(localSearchIndex[key]);
  loadedFor.value = key;
  loading.value = false;
};

const sections = computed<SearchSection[]>(() => namedSections(theme.value.nav));
const pages = computed<NuiCommandItem[]>(() => pageItems(allLinks.value));

const hits = computed<SearchHit[]>(() => {
  const needle = query.value.trim();
  const search = index.value;

  return needle === '' || search === null ? [] : searchHits(search, needle);
});

const searching = computed(() => query.value.trim() !== '' && index.value !== null);
const snippets = computed(() => snippetsOf(hits.value));

const items = computed<NuiCommandItem[]>(() =>
  searching.value ? searchItems(hits.value) : pages.value,
);

const go = (item: NuiCommandItem): void => {
  void router.go(item.value);
};

watch(open, (isOpen) => {
  if (isOpen) {
    void loadIndex();
  }
});
</script>
