<template>
  <span v-if="icon || $slots.leading" class="nui-list-item__leading">
    <slot name="leading"><NuiIcon v-if="icon" :alias="icon" /></slot>
  </span>
  <span class="nui-list-item__body">
    <span class="nui-list-item__title"
      ><slot>{{ title }}</slot></span
    >
    <span v-if="description || $slots.description" class="nui-list-item__description">
      <slot name="description">{{ description }}</slot>
    </span>
  </span>
  <span v-if="$slots.trailing" class="nui-list-item__trailing"><slot name="trailing" /></span>
</template>

<script setup lang="ts">
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiListRowProps } from './list.types';

const { title, description, icon } = defineProps<NuiListRowProps>();
</script>
