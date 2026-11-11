<template>
  <NuiBreadcrumbs :items="path" />
</template>

<script setup lang="ts">
import { NuiBreadcrumbs, type NuiBreadcrumbItem } from '@numior/vue';

const path: NuiBreadcrumbItem[] = [
  { label: 'Каталог', href: '#' },
  { label: 'Мебель', href: '#' },
  { label: 'Столы', href: '#' },
  { label: 'Стол «Мальмё»' },
];
</script>
