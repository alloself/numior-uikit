<template>
  <tr v-if="loading && $slots.loading" class="nui-table__row nui-table__row--status">
    <td :colspan="span" class="nui-table__cell nui-table__cell--status">
      <slot name="loading" />
    </td>
  </tr>
  <template v-else-if="loading">
    <tr
      v-for="line in loadingRows"
      :key="line"
      class="nui-table__row nui-table__row--loading"
      aria-hidden="true"
    >
      <td v-if="selectable" class="nui-table__cell nui-table__cell--select">
        <NuiSkeleton shape="rect" width="1rem" height="1rem" />
      </td>
      <td v-for="column in columns" :key="column.key" class="nui-table__cell">
        <NuiSkeleton />
      </td>
    </tr>
  </template>
  <tr v-else class="nui-table__row nui-table__row--status">
    <td :colspan="span" class="nui-table__cell nui-table__cell--status">
      <slot name="empty"><NuiEmpty size="sm" :title="emptyLabel" /></slot>
    </td>
  </tr>
</template>

<script setup lang="ts" generic="T">
import NuiEmpty from '../empty/NuiEmpty.vue';
import NuiSkeleton from '../skeleton/NuiSkeleton.vue';
import type { NuiTableStatusProps } from './table.types';

const { span, loading, loadingRows, columns, selectable, emptyLabel } =
  defineProps<NuiTableStatusProps<T>>();
</script>
