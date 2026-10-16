<template>
  <NuiCheckbox
    size="sm"
    :model-value="value === true"
    :readonly="!editable"
    :aria-label="label"
    tabindex="-1"
    @update:model-value="(checked) => emit('change', checked)"
  />
</template>

<script setup lang="ts">
import { NuiCheckbox } from '@numior/vue';
import type { NuiContentCellViewProps } from './content-table.types';

const { value, editable, label } = defineProps<NuiContentCellViewProps>();

const emit = defineEmits<{ change: [value: boolean] }>();
</script>
