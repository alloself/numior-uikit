<template>
  <NuiPagination
    :page="page"
    :total="60"
    :href="hrefOf"
    :show-range="false"
    edges
    label="Страницы каталога"
    @update:page="page = $event"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiPagination } from '@numior/kit';

const page = ref(2);
const hrefOf = (target: number): string => `#catalog-page-${target}`;
</script>
