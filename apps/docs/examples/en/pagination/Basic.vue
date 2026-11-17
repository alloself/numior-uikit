<template>
  <NuiPagination
    v-model:page="page"
    v-model:page-size="pageSize"
    :total="240"
    :page-sizes="[10, 20, 50]"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiPagination } from '@numior/kit';

const page = ref(3);
const pageSize = ref(20);
</script>
