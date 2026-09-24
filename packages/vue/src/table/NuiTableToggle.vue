<template>
  <button
    v-if="view.hasChildren"
    type="button"
    class="nui-table__toggle"
    :class="{
      'nui-table__toggle--expanded': view.expanded,
      'nui-table__toggle--loading': view.loading,
    }"
    :aria-expanded="view.expanded"
    :aria-label="label"
    :aria-busy="view.loading || undefined"
    @click="emit('expand')"
  >
    <NuiIcon :alias="view.loading ? 'loader' : 'chevron-right'" class="nui-table__toggle-icon" />
  </button>
  <span v-else class="nui-table__toggle nui-table__toggle--leaf" aria-hidden="true"></span>
</template>

<script setup lang="ts" generic="T">
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiTableRowView } from './rows';

const { view, label } = defineProps<{ view: NuiTableRowView<T>; label: string }>();
const emit = defineEmits<{ expand: [] }>();
</script>
