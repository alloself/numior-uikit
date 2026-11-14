<template>
  <NuiBreadcrumbs :items="path" label="Путь" />
</template>

<script setup lang="ts">
import { NuiBreadcrumbs, type NuiBreadcrumbItem } from '@numior/vue';

const path: NuiBreadcrumbItem[] = [
  { label: 'Каталог', href: '#', icon: 'folder' },
  { label: 'Мебель', href: '#' },
  { label: 'Кресла и стулья' },
];
</script>
