<template>
  <div class="flex w-full flex-col gap-3">
    <NuiAlert title="Draft saved" description="Sync with the server in a minute." />
    <NuiAlert tone="success" variant="outline" title="Project published" />
    <NuiAlert
      tone="error"
      variant="solid"
      title="Could not connect"
      description="Check the network and retry."
    />
  </div>
</template>

<script setup lang="ts">
import { NuiAlert } from '@numior/vue';
</script>
