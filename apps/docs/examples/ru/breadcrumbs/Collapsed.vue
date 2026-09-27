<template>
  <NuiBreadcrumbs :items="path" :max-items="3" label="Полный путь" />
</template>

<script setup lang="ts">
import { NuiBreadcrumbs, type NuiBreadcrumbItem } from '@numior/vue';

const path: NuiBreadcrumbItem[] = [
  { label: 'Каталог', href: '#' },
  { label: 'Мебель', href: '#' },
  { label: 'Офис', href: '#' },
  { label: 'Стулья', href: '#' },
  { label: 'Кресло «Осло»' },
];
</script>
