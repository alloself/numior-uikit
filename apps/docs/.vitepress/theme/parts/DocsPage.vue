<template>
  <div class="max-w-3xl mx-auto p-6">
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
import { useDocs } from '../composables/use-docs';
import { editUrl, site } from '../site';
import DocsPager from './DocsPager.vue';

const { page } = useData();
const { texts } = useDocs();

const edit = computed(() => editUrl(site, page.value.relativePath));
</script>
