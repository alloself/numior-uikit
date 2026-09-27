<template>
  <NuiBreadcrumbs v-slot="{ item, current }" :items="path" label="Path">
    <strong v-if="current">{{ item.label }}</strong>
    <NuiLink v-else :href="item.href" tone="neutral" underline="hover">{{ item.label }}</NuiLink>
  </NuiBreadcrumbs>
</template>

<script setup lang="ts">
import { NuiBreadcrumbs, NuiLink, type NuiBreadcrumbItem } from '@numior/vue';

const path: NuiBreadcrumbItem[] = [
  { label: 'Projects', href: '#' },
  { label: 'Catalogue 2026', href: '#' },
  { label: 'Tasks' },
];
</script>
