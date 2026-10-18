<template>
  <div class="zone" v-bind="drop.attrs">
    <span class="child">inner</span>
  </div>
</template>

<script setup lang="ts">
import { useFileDrop } from '../../src';

const { disabled } = defineProps<{
  disabled: () => boolean;
}>();

const emit = defineEmits<{
  files: [files: File[]];
}>();

const drop = useFileDrop({ disabled, onFiles: (files) => emit('files', files) });

defineExpose({ drop });
</script>
