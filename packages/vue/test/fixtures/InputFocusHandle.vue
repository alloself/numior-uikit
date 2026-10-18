<template>
  <NuiInput ref="input" />
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { NuiInput } from '../../src';

const input = useTemplateRef('input');

const focusInput = (): void => {
  input.value?.focus();
};

defineExpose({ focusInput });
</script>
