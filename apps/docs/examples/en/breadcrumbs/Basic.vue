<template>
  <NuiBreadcrumbs :items="path" label="Path" />
</template>

<script setup lang="ts">
import { NuiBreadcrumbs, type NuiBreadcrumbItem } from '@numior/kit';

const path: NuiBreadcrumbItem[] = [
  { label: 'Catalog', href: '#', icon: 'folder' },
  { label: 'Furniture', href: '#' },
  { label: 'Chairs' },
];
</script>
