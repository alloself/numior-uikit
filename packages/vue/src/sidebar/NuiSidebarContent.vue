<template>
  <nav class="nui-sidebar__content" :aria-label="label"><slot /></nav>
</template>

<script setup lang="ts">
import type { NuiSidebarContentProps } from './sidebar.types';

const { label } = defineProps<NuiSidebarContentProps>();

defineSlots<{ default(): unknown }>();
</script>
