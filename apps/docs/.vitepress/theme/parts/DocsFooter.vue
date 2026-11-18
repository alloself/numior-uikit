<template>
  <footer class="border-t">
    <div
      class="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-layout-gutter py-8 text-sm text-muted-foreground"
    >
      <div class="flex flex-col gap-2">
        <NuiLink :href="localeBase" tone="neutral" underline="none" :aria-label="site.title">
          <DocsLogo />
        </NuiLink>
        <p class="m-0">{{ texts.license }}</p>
      </div>
      <nav :aria-label="texts.footerSections" class="flex flex-wrap gap-x-6 gap-y-2">
        <NuiLink
          v-for="item in theme.nav"
          :key="item.link"
          :href="withBase(item.link)"
          tone="neutral"
          underline="hover"
          >{{ item.text }}</NuiLink
        >
        <NuiLink v-if="repository" :href="repository" tone="neutral" underline="hover" external
          >GitHub</NuiLink
        >
      </nav>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useData, withBase } from 'vitepress';
import { NuiLink } from '@numior/vue';
import { useDocs } from '../composables/use-docs';
import { repositoryUrl, site as docsSite } from '../site';
import type { DocsThemeConfig } from '../theme.types';
import DocsLogo from './DocsLogo.vue';

const { theme, site } = useData<DocsThemeConfig>();
const { texts, localeBase } = useDocs();

const repository = repositoryUrl(docsSite);
</script>
