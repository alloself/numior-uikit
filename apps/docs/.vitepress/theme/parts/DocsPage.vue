<template>
  <div class="max-w-3xl mx-auto p-6">
    <article id="docs-content" class="nui-prose" tabindex="-1">
      <Content />
    </article>
    <DocsPager />
  </div>
</template>

<script setup lang="ts">
import { Content } from 'vitepress';
import DocsPager from './DocsPager.vue';
</script>
