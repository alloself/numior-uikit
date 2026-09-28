<template>
  <div class="flex flex-col gap-3 w-full max-w-sm">
    <NuiList variant="divided" class="w-full max-w-sm">
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
    <p class="text-sm text-muted-foreground">Opened: {{ opened || '—' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiList, NuiListItem } from '@numior/vue';

const opened = ref('');
</script>
