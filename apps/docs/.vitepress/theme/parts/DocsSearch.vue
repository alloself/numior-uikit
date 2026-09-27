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
  />
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { useData, useRouter } from 'vitepress';
import localSearchIndex from '@localSearchIndex';
import { NuiCommandDialog, type NuiCommandItem, type NuiCommandSource } from '@numior/vue';
import { useDocs } from '../composables/use-docs';
import { loadSearchIndex, searchItems, type SearchIndex } from '../search-index';

const open = defineModel<boolean>('open', { default: false });

const { localeIndex } = useData();
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

const pages = computed<NuiCommandSource>(() => [
  {
    label: texts.value.searchPages,
    items: allLinks.value.map((item) => ({ value: item.link, label: item.text, icon: 'file' })),
  },
]);

const items = computed<NuiCommandSource>(() => {
  const needle = query.value.trim();
  const search = index.value;

  return needle === '' || search === null ? pages.value : searchItems(search, needle);
});

const go = (item: NuiCommandItem): void => {
  void router.go(item.value);
};

watch(open, (isOpen) => {
  if (isOpen) {
    void loadIndex();
  }
});
</script>
