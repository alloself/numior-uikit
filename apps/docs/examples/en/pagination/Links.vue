<template>
  <NuiPagination
    :page="page"
    :total="60"
    :href="hrefOf"
    :show-range="false"
    edges
    label="Catalogue pages"
    @update:page="page = $event"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiPagination } from '@numior/vue';

const page = ref(2);
const hrefOf = (target: number): string => `#catalogue-page-${target}`;
</script>
