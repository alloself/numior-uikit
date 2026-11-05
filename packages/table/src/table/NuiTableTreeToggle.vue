<template>
  <span class="nui-table__tree" :style="{ '--_level': level }" aria-hidden="true">
    <span v-if="loading" class="nui-table__spinner"><NuiIcon icon="loader" /></span>
    <span
      v-else-if="expandable"
      :key="node"
      class="nui-table__toggle nui-table__toggle--expandable"
      @mousedown.prevent
      @click="emit('toggle')"
    >
      <NuiIcon icon="chevron-right" />
    </span>
    <span v-else class="nui-table__toggle"></span>
  </span>
</template>

<script setup lang="ts">
import { NuiIcon } from '@numior/vue';
import type { NuiTableTreeToggleProps } from './table.types';

const { node, level, expandable, loading } = defineProps<NuiTableTreeToggleProps>();

const emit = defineEmits<{ toggle: [] }>();
</script>
