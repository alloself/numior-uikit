<template>
  <div class="nui-sidebar-group">
    <div v-if="label" :id="labelId" class="nui-sidebar-group__label">{{ label }}</div>
    <ul class="nui-sidebar-group__items" :aria-labelledby="label ? labelId : undefined">
      <slot />
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useControlId } from '@numior/primitives';
import type { NuiSidebarGroupProps } from './sidebar.types';

const { label } = defineProps<NuiSidebarGroupProps>();

defineSlots<{ default(): unknown }>();

const labelId = useControlId();
</script>
