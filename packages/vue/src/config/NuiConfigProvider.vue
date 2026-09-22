<script setup lang="ts">
import { provideNuiConfig } from '@numior/primitives';
import type { NuiConfigProviderProps } from './config.types';

const { icons } = defineProps<NuiConfigProviderProps>();
provideNuiConfig({ icons });
</script>

<template>
  <slot />
</template>
