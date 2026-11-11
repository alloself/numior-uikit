<template>
  <div id="docs-content" class="mx-auto mt-8 flex max-w-3xl flex-col gap-8 p-6" tabindex="-1">
    <NuiEmpty :title="texts.notFoundTitle" :description="texts.notFoundText" icon="search">
      <template #actions>
        <NuiButton @click="emit('search')">{{ texts.notFoundSearch }}</NuiButton>
        <NuiButton :href="localeBase" variant="outline" tone="neutral">{{ texts.home }}</NuiButton>
      </template>
    </NuiEmpty>
    <nav
      v-if="suggestions.length > 0"
      :aria-label="texts.notFoundSimilar"
      class="flex flex-col items-center gap-2"
    >
      <DocsCaption>{{ texts.notFoundSimilar }}</DocsCaption>
      <NuiLink v-for="item in suggestions" :key="item.link" :href="withBase(item.link)">{{
        item.text
      }}</NuiLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, watch } from 'vue';
import { useRoute, withBase } from 'vitepress';
import { NuiButton, NuiEmpty, NuiLink } from '@numior/vue';
import { useDocs } from '../composables/use-docs';
import { suggestionsOf } from '../suggestions';
import type { DocsSidebarItem } from '../theme.types';
import DocsCaption from './DocsCaption.vue';

const emit = defineEmits<{ search: [] }>();

const route = useRoute();
const { texts, localeBase, allLinks } = useDocs();
const suggestions = shallowRef<DocsSidebarItem[]>([]);

const suggest = (): void => {
  suggestions.value = suggestionsOf(route.path, allLinks.value);
};

onMounted(suggest);
watch(() => route.path, suggest);
</script>
