<template>
  <NuiCollapsible v-bind="collapsible" v-model:open="open">
    {{ content }}
    <template v-if="trigger !== undefined" #trigger>{{ trigger }}</template>
  </NuiCollapsible>
</template>

<script setup lang="ts">
import { NuiCollapsible, type NuiCollapsibleProps } from '../../src';

const {
  collapsible = {},
  content,
  trigger,
} = defineProps<{
  collapsible?: NuiCollapsibleProps | undefined;
  content: string;
  trigger?: string | undefined;
}>();

const open = defineModel<boolean>('open', { required: true });

defineExpose({ open });
</script>
