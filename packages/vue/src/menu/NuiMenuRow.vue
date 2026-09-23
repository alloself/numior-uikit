<template>
  <span v-if="$slots.indicator" class="nui-menu-item__indicator">
    <slot name="indicator" />
  </span>
  <NuiIcon v-if="icon" :alias="icon" class="nui-menu-item__icon" />
  <span class="nui-menu-item__label"><slot /></span>
  <span v-if="shortcut" class="nui-menu-item__shortcut">{{ shortcut }}</span>
  <slot name="trailing" />
</template>

<script setup lang="ts">
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiMenuRowProps } from './menu.types';

const { icon, shortcut } = defineProps<NuiMenuRowProps>();
</script>
