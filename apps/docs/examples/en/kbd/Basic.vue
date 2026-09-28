<template>
  <p class="m-0 text-sm">
    Press <NuiKbd keys="mod+k" /> to search, <NuiKbd :keys="['mod+shift+p']" /> for the command
    palette and <NuiKbd variant="plain">Esc</NuiKbd> to leave.
  </p>
</template>

<script setup lang="ts">
import { NuiKbd } from '@numior/vue';
</script>
