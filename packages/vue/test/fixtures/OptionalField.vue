<template>
  <NuiField v-if="field" v-bind="field"><slot /></NuiField>
  <slot v-else />
</template>

<script setup lang="ts">
import { NuiField, type NuiFieldProps } from '../../src';

const { field } = defineProps<{ field?: NuiFieldProps | undefined }>();
</script>
