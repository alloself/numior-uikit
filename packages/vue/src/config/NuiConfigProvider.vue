<template>
  <slot />
</template>

<script setup lang="ts">
import { provideNuiConfig } from '@numior/primitives';
import type { NuiConfigProviderProps } from './config.types';

const { icons, locale, today } = defineProps<NuiConfigProviderProps>();
provideNuiConfig({ icons, locale: () => locale, today });
</script>
