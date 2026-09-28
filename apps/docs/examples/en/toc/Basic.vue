<template>
  <div class="w-full grid-auto gap-6">
    <div ref="article" class="h-80 overflow-auto border rounded-md p-4" tabindex="0">
      <h2 id="toc-demo-install" class="mt-0 text-lg font-semibold">Installation</h2>
      <p>The package installs from the workspace, styles are imported per file.</p>
      <p>Theme tokens come from base.css.</p>
      <h2 id="toc-demo-usage" class="text-lg font-semibold">Usage</h2>
      <p>The component takes list items and a scroll root.</p>
      <h3 id="toc-demo-basic" class="font-semibold">Basic example</h3>
      <p>Headings with ids are enough.</p>
      <p>Nested children give a second level.</p>
      <h3 id="toc-demo-advanced" class="font-semibold">Advanced example</h3>
      <p>The active item follows the scroll.</p>
      <p>The root can change on the fly.</p>
      <h2 id="toc-demo-api" class="text-lg font-semibold">API</h2>
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
