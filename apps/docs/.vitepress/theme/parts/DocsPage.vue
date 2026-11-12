<template>
  <div class="relative mx-auto p-6" :class="wide ? 'max-w-6xl' : 'max-w-3xl'">
    <CopyPage v-if="twin" :path="twin" :texts="texts" />
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
import { Content, useData, withBase } from 'vitepress';
import { NuiLink } from '@numior/vue';
import { useDocs } from '../composables/use-docs';
import { editUrl, site } from '../site';
import CopyPage from './CopyPage.vue';
import DocsPager from './DocsPager.vue';

const { page, frontmatter } = useData();
const { texts, allLinks, isCurrent } = useDocs();

const wide = computed(() => frontmatter.value.layout === 'wide');
const edit = computed(() => editUrl(site, page.value.relativePath));

const twin = computed(() =>
  allLinks.value.some((item) => isCurrent(item.link))
    ? withBase(`/${page.value.relativePath}`)
    : undefined,
);
</script>
