<template>
  <NuiCheckbox
    v-if="control === 'checkbox'"
    :model-value="checked"
    :indeterminate="indeterminate"
    :disabled="disabled"
    :aria-label="label"
    size="sm"
    tabindex="-1"
    @update:model-value="emit('toggle')"
  />
  <NuiSkeleton v-else-if="control === 'skeleton'" shape="rect" width="1rem" height="1rem" />
</template>

<script setup lang="ts">
import { NuiCheckbox, NuiSkeleton } from '@numior/vue';
import type { NuiTableUtilityCellProps } from './table.types';

const {
  control,
  checked = false,
  indeterminate = false,
  disabled = false,
  label,
} = defineProps<NuiTableUtilityCellProps>();

const emit = defineEmits<{ toggle: [] }>();
</script>
