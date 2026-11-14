<template>
  <span
    ref="handle"
    class="nui-table__grip"
    :class="{ 'nui-table__grip--active': active }"
    aria-hidden="true"
  >
    <NuiIcon icon="grip" />
  </span>
</template>

<script setup lang="ts">
import { NuiIcon } from '@numior/vue';
import { useTemplateRef } from 'vue';
import { useTableHandle } from './table-handles';
import type { NuiTableGripProps } from './table.types';

const { active = false } = defineProps<NuiTableGripProps>();

const emit = defineEmits<{ grab: [event: PointerEvent] }>();

useTableHandle(useTemplateRef('handle'), (event) => {
  emit('grab', event);
});
</script>
