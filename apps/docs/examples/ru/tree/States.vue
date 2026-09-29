<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <NuiTree :items="[]" loading variant="bordered" label="Проекты" class="w-full" />
    <NuiTree :items="[]" variant="bordered" label="Архив" empty-label="Архив пуст" class="w-full" />
  </div>
</template>

<script setup lang="ts">
import { NuiTree } from '@numior/vue';
</script>
