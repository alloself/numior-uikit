<template>
  <span v-if="$slots.indicator" class="nui-menu-item__indicator">
    <slot name="indicator" />
  </span>
  <NuiIcon v-if="icon" :alias="icon" class="nui-menu-item__icon" />
  <span class="nui-menu-item__label"><slot /></span>
  <NuiKbd
    v-if="shortcut"
    :keys="shortcut"
    variant="plain"
    size="sm"
    class="nui-menu-item__shortcut"
  />
  <slot name="trailing" />
</template>

<script setup lang="ts">
import NuiIcon from '../icon/NuiIcon.vue';
import NuiKbd from '../kbd/NuiKbd.vue';
import type { NuiMenuRowProps } from './menu.types';

const { icon, shortcut } = defineProps<NuiMenuRowProps>();
</script>
