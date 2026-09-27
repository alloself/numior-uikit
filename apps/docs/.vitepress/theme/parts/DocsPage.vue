<template>
  <div class="nui-max-w-3xl nui-mx-auto nui-p-6">
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
