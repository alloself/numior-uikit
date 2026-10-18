<template>
  <NuiButton v-if="content === 'none'" v-bind="button" />
  <NuiButton v-else v-bind="button">
    <NuiIcon v-if="content !== 'text'" icon="x" />
    <template v-if="content !== 'icon'">{{ label }}</template>
  </NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, NuiIcon, type NuiButtonProps } from '../../src';

const { button, content, label } = defineProps<{
  button: NuiButtonProps;
  content: 'text' | 'icon' | 'icon-with-text' | 'none';
  label: string;
}>();
</script>
