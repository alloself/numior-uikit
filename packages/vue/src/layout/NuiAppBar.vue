<template>
  <header class="nui-app-bar" :class="{ 'nui-app-bar--sticky': sticky }">
    <div v-if="$slots.start" class="nui-app-bar__start"><slot name="start" /></div>
    <div class="nui-app-bar__content">
      <div class="nui-app-bar__body"><slot /></div>
      <div v-if="$slots.end" class="nui-app-bar__end"><slot name="end" /></div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { NuiAppBarProps } from './layout.types';

const { sticky = true } = defineProps<NuiAppBarProps>();

defineSlots<{ start(): unknown; default(): unknown; end(): unknown }>();
</script>
