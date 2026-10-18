<template>
  <NuiDialog v-if="content === 'dialog'" />
  <template v-else-if="content === 'icons'">
    <NuiIcon icon="check" />
    <NuiIcon icon="x" />
  </template>
  <NuiNumberField v-else :model-value="1234.5" />
</template>

<script setup lang="ts">
import {
  NuiDialog,
  NuiIcon,
  NuiNumberField,
  provideNuiConfig,
  type NuiConfigOptions,
} from '../../src';

const { inner = {}, content } = defineProps<{
  inner?: NuiConfigOptions | undefined;
  content: 'dialog' | 'icons' | 'number';
}>();

provideNuiConfig(inner);
</script>
