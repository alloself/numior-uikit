<template>
  <NuiAlert title="Draft saved" description="Sync with the server in a minute." />
  <NuiAlert tone="success" variant="outline" title="Project published" />
  <NuiAlert
    tone="error"
    variant="solid"
    title="Could not connect"
    description="Check the network and retry."
  />
</template>

<script setup lang="ts">
import { NuiAlert } from '@numior/vue';
</script>
