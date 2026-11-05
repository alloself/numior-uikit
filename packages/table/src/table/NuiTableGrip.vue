<template>
  <span
    class="nui-table__grip"
    :class="{ 'nui-table__grip--active': active }"
    aria-hidden="true"
    @pointerdown="emit('grab', $event)"
  >
    <NuiIcon icon="grip" />
  </span>
</template>

<script setup lang="ts">
import { NuiIcon } from '@numior/vue';
import type { NuiTableGripProps } from './table.types';

const { active = false } = defineProps<NuiTableGripProps>();

const emit = defineEmits<{ grab: [event: PointerEvent] }>();
</script>
