<template>
  <NuiCheckbox
    v-if="control === TableUtilityControl.Checkbox"
    :model-value="checked"
    :indeterminate="indeterminate"
    :disabled="disabled"
    :aria-label="label"
    size="sm"
    tabindex="-1"
    @update:model-value="emit('toggle')"
  />
  <NuiSkeleton
    v-else-if="control === TableUtilityControl.Skeleton"
    shape="rect"
    width="1rem"
    height="1rem"
  />
  <span v-else-if="control === TableUtilityControl.Label" class="nui-table__text">{{ text }}</span>
  <span v-else-if="control === TableUtilityControl.Corner" class="nui-table__hidden">{{
    label
  }}</span>
</template>

<script setup lang="ts">
import { NuiCheckbox, NuiSkeleton } from '@numior/vue';
import { TableUtilityControl, type NuiTableUtilityCellProps } from './table.types';

const {
  control,
  checked = false,
  indeterminate = false,
  disabled = false,
  label,
  text,
} = defineProps<NuiTableUtilityCellProps>();

const emit = defineEmits<{ toggle: [] }>();
</script>
