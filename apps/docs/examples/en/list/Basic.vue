<template>
  <NuiList variant="divided" class="nui-w-full nui-max-w-sm">
    <NuiListItem
      icon="file"
      label="Contract.pdf"
      description="348 KB · yesterday"
      href="#contract"
    />
    <NuiListItem icon="image" label="Mockup.png" description="1.2 MB · today" href="#layout" />
    <NuiListItem
      icon="folder"
      label="Archive"
      description="12 files"
      interactive
      @click="opened = 'Archive'"
    />
  </NuiList>
  <p class="nui-text-sm nui-text-muted">Opened: {{ opened || '—' }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiList, NuiListItem } from '@numior/vue';

const opened = ref('');
</script>
