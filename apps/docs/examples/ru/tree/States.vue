<template>
  <div class="grid w-full gap-3 sm:grid-cols-2">
    <NuiTree :items="[]" loading variant="outline" label="Категории" class="w-full" />
    <NuiTree
      :items="[]"
      variant="outline"
      label="Возвраты"
      empty-label="Возвратов пока нет"
      class="w-full"
    />
  </div>
</template>

<script setup lang="ts">
import { NuiTree } from '@numior/kit';
</script>
