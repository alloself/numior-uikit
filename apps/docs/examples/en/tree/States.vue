<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <NuiTree :items="[]" loading variant="bordered" label="Projects" class="w-full" />
    <NuiTree
      :items="[]"
      variant="bordered"
      label="Archive"
      empty-label="Archive is empty"
      class="w-full"
    />
  </div>
</template>

<script setup lang="ts">
import { NuiTree } from '@numior/vue';
</script>
