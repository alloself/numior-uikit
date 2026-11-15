<template>
  <div class="grid w-full gap-3 sm:grid-cols-2">
    <NuiTree :items="[]" loading variant="outline" label="Categories" class="w-full" />
    <NuiTree
      :items="[]"
      variant="outline"
      label="Returns"
      empty-label="No returns yet"
      class="w-full"
    />
  </div>
</template>

<script setup lang="ts">
import { NuiTree } from '@numior/vue';
</script>
