<template>
  <div
    class="nui-spreadsheet__note"
    :class="{ 'nui-spreadsheet__note--shown': shown, 'nui-spreadsheet__note--lifted': lifted }"
    aria-hidden="true"
    @pointerenter="emit('hold')"
    @pointerleave="emit('release')"
    @click="emit('close')"
  >
    <span class="nui-spreadsheet__note-icon"><NuiIcon icon="warning" /></span>
    <span class="nui-spreadsheet__note-text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
import { NuiIcon } from '@numior/vue';
import type { SheetNoteProps } from './sheet.types';

const { text, shown, lifted } = defineProps<SheetNoteProps>();

const emit = defineEmits<{
  hold: [];
  release: [];
  close: [];
}>();
</script>
