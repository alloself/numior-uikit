<template>
  <span class="nui-table__tree" :style="{ '--_level': level }" aria-hidden="true">
    <NuiIcon v-if="loading" alias="loader" class="nui-table__spinner" />
    <span
      v-else-if="expandable"
      class="nui-table__toggle nui-table__toggle--expandable"
      @mousedown.prevent
      @click="emit('toggle')"
    >
      <NuiIcon alias="chevron-right" class="nui-table__chevron" />
    </span>
    <span v-else class="nui-table__toggle"></span>
  </span>
</template>

<script setup lang="ts">
import { NuiIcon } from '@numior/vue';
import type { NuiTableTreeToggleProps } from './table.types';

const { level, expandable, loading } = defineProps<NuiTableTreeToggleProps>();

const emit = defineEmits<{ toggle: [] }>();
</script>
