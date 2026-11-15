<template>
  <NuiBreadcrumbs :items="path" label="Path" />
</template>

<script setup lang="ts">
import { NuiBreadcrumbs, type NuiBreadcrumbItem } from '@numior/vue';

const path: NuiBreadcrumbItem[] = [
  { label: 'Catalog', href: '#', icon: 'folder' },
  { label: 'Furniture', href: '#' },
  { label: 'Chairs' },
];
</script>
