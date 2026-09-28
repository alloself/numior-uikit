<template>
  <div class="w-full max-w-sm">
    <NuiPagination v-model:page="page" :total="120" size="sm" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiPagination } from '@numior/vue';

const page = ref(4);
</script>
