<script setup lang="ts">
import { provideNuiConfig } from '@numior/primitives';
import type { NuiConfigProviderProps } from './config.types';

const props = defineProps<NuiConfigProviderProps>();
provideNuiConfig({ icons: props.icons });
</script>

<template>
  <slot />
</template>
