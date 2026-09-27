<template>
  <div class="nui-w-full nui-grid-auto nui-gap-6">
    <div
      ref="article"
      class="nui-h-80 nui-overflow-auto nui-border nui-rounded nui-p-4"
      tabindex="0"
    >
      <h2 id="toc-demo-install" class="nui-mt-0 nui-text-lg nui-font-semibold">Installation</h2>
      <p>The package installs from the workspace, styles are imported per file.</p>
      <p>Theme tokens come from base.css.</p>
      <h2 id="toc-demo-usage" class="nui-text-lg nui-font-semibold">Usage</h2>
      <p>The component takes list items and a scroll root.</p>
      <h3 id="toc-demo-basic" class="nui-font-semibold">Basic example</h3>
      <p>Headings with ids are enough.</p>
      <p>Nested children give a second level.</p>
      <h3 id="toc-demo-advanced" class="nui-font-semibold">Advanced example</h3>
      <p>The active item follows the scroll.</p>
      <p>The root can change on the fly.</p>
      <h2 id="toc-demo-api" class="nui-text-lg nui-font-semibold">API</h2>
      <p>The line sets the height share where the active item changes.</p>
      <p>Props, events and slots are listed in the tables.</p>
      <p>The select event fires on click.</p>
    </div>
    <NuiToc :items="items" :root="article" @select="last = $event" />
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { NuiToc, type NuiTocItem } from '@numior/vue';

const article = useTemplateRef<HTMLElement>('article');
const last = ref('');

const items: readonly NuiTocItem[] = [
  { id: 'toc-demo-install', label: 'Installation' },
  {
    id: 'toc-demo-usage',
    label: 'Usage',
    children: [
      { id: 'toc-demo-basic', label: 'Basic example' },
      { id: 'toc-demo-advanced', label: 'Advanced example' },
    ],
  },
  { id: 'toc-demo-api', label: 'API' },
];
</script>
