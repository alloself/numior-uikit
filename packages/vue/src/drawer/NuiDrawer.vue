<template>
  <NuiDialog
    v-model:open="open"
    :id="id"
    :title="title"
    :description="description"
    :closable="closable"
    :close-on-backdrop="closeOnBackdrop"
    :close-label="closeLabel"
    class="nui-drawer"
    :class="[`nui-drawer--side-${side}`, `nui-drawer--size-${size}`]"
    @close="emit('close', $event)"
  >
    <template v-if="$slots.title" #title><slot name="title" /></template>
    <template v-if="$slots.description" #description><slot name="description" /></template>
    <template v-if="$slots.default" #default><slot /></template>
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </NuiDialog>
</template>

<script setup lang="ts">
import NuiDialog from '../dialog/NuiDialog.vue';
import { NuiDrawerSide, NuiDrawerSize, type NuiDrawerProps } from './drawer.types';

const {
  id,
  title,
  description,
  size = NuiDrawerSize.Md,
  closable = true,
  closeOnBackdrop = true,
  closeLabel,
  side = NuiDrawerSide.End,
} = defineProps<NuiDrawerProps>();

const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ close: [returnValue: string] }>();

defineSlots<{
  title?(): unknown;
  description?(): unknown;
  default?(): unknown;
  footer?(): unknown;
}>();
</script>
