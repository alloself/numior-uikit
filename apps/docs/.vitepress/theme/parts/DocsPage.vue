<template>
  <div class="mx-auto p-6" :class="wide ? 'max-w-6xl' : 'max-w-3xl'">
    <article id="docs-content" class="nui-prose" tabindex="-1">
      <Content />
    </article>
    <p v-if="edit" class="mt-8 mb-0 text-sm">
      <NuiLink :href="edit" tone="neutral" external>{{ texts.editPage }}</NuiLink>
    </p>
    <DocsPager />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Content, useData } from 'vitepress';
import { NuiLink } from '@numior/vue';
import { useAnchorHold } from '../composables/use-anchor-hold';
import { useDocs } from '../composables/use-docs';
import { editUrl, site } from '../site';
import DocsPager from './DocsPager.vue';

const { page, frontmatter } = useData();
const { texts } = useDocs();

const wide = computed(() => frontmatter.value.layout === 'wide');
const edit = computed(() => editUrl(site, page.value.relativePath));

useAnchorHold();
</script>
