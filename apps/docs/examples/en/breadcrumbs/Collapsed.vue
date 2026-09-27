<template>
  <NuiBreadcrumbs :items="path" :max-items="3" label="Full path" />
</template>

<script setup lang="ts">
import { NuiBreadcrumbs, type NuiBreadcrumbItem } from '@numior/vue';

const path: NuiBreadcrumbItem[] = [
  { label: 'Catalogue', href: '#' },
  { label: 'Furniture', href: '#' },
  { label: 'Office', href: '#' },
  { label: 'Chairs', href: '#' },
  { label: 'Oslo armchair' },
];
</script>
