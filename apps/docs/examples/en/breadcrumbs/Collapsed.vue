<template>
  <NuiBreadcrumbs :items="path" :max-items="3" label="Product path" />
</template>

<script setup lang="ts">
import { NuiBreadcrumbs, type NuiBreadcrumbItem } from '@numior/kit';

const path: NuiBreadcrumbItem[] = [
  { label: 'Dashboard', href: '#' },
  { label: 'Catalog', href: '#' },
  { label: 'Furniture', href: '#' },
  { label: 'Chairs', href: '#' },
  { label: 'Oslo armchair' },
];
</script>
