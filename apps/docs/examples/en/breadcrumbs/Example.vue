<template>
  <NuiBreadcrumbs :items="path" />
</template>

<script setup lang="ts">
import { NuiBreadcrumbs, type NuiBreadcrumbItem } from '@numior/kit';

const path: NuiBreadcrumbItem[] = [
  { label: 'Catalog', href: '#' },
  { label: 'Furniture', href: '#' },
  { label: 'Tables', href: '#' },
  { label: 'Malmo desk' },
];
</script>
