<template>
  <NuiBreadcrumbs :items="path" :max-items="3" label="Путь к товару" />
</template>

<script setup lang="ts">
import { NuiBreadcrumbs, type NuiBreadcrumbItem } from '@numior/vue';

const path: NuiBreadcrumbItem[] = [
  { label: 'Кабинет', href: '#' },
  { label: 'Каталог', href: '#' },
  { label: 'Мебель', href: '#' },
  { label: 'Кресла и стулья', href: '#' },
  { label: 'Кресло «Осло»' },
];
</script>
