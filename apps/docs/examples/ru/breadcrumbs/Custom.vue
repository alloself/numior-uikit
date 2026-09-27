<template>
  <NuiBreadcrumbs v-slot="{ item, current }" :items="path" label="Путь">
    <strong v-if="current">{{ item.label }}</strong>
    <NuiLink v-else :href="item.href" tone="neutral" underline="hover">{{ item.label }}</NuiLink>
  </NuiBreadcrumbs>
</template>

<script setup lang="ts">
import { NuiBreadcrumbs, NuiLink, type NuiBreadcrumbItem } from '@numior/vue';

const path: NuiBreadcrumbItem[] = [
  { label: 'Проекты', href: '#' },
  { label: 'Каталог 2026', href: '#' },
  { label: 'Задачи' },
];
</script>
