<template>
  <span class="nui-grid__tree" :style="{ '--_level': level }" aria-hidden="true">
    <NuiIcon v-if="loading" alias="loader" class="nui-grid__spinner" />
    <span
      v-else-if="expandable"
      class="nui-grid__toggle nui-grid__toggle--expandable"
      @click="emit('toggle')"
    >
      <NuiIcon alias="chevron-right" class="nui-grid__chevron" />
    </span>
    <span v-else class="nui-grid__toggle"></span>
  </span>
</template>

<script setup lang="ts">
import { NuiIcon } from '@numior/vue';
import type { NuiDataGridTreeToggleProps } from './data-grid.types';

const { level, expandable, loading } = defineProps<NuiDataGridTreeToggleProps>();

const emit = defineEmits<{ toggle: [] }>();
</script>
