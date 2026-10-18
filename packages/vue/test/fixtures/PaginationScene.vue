<template>
  <NuiPagination v-bind="props" v-model:page="page" v-model:page-size="pageSize" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiPagination, type NuiPaginationProps } from '../../src';

const {
  props,
  initialPage = 1,
  initialPageSize = 20,
} = defineProps<{
  props: NuiPaginationProps;
  initialPage?: number | undefined;
  initialPageSize?: number | undefined;
}>();

const page = ref(initialPage);
const pageSize = ref(initialPageSize);

defineExpose({ page, pageSize });
</script>
