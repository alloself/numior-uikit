<template>
  <NuiDialog
    v-model:open="open"
    :id="id"
    :title="title"
    :description="description"
    :size="size"
    :closable="closable"
    :close-on-backdrop="closeOnBackdrop"
    :close-label="closeLabel"
    class="nui-drawer"
    :class="[`nui-drawer--side-${side}`, `nui-drawer--size-${size}`]"
    @close="emit('close', $event)"
  >
    <template v-for="name in slotNames" :key="name" #[name]>
      <slot :name="name" />
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import NuiDialog from '../dialog/NuiDialog.vue';
import type { NuiDrawerProps } from './drawer.types';

const {
  id,
  title,
  description,
  size = 'md',
  closable = true,
  closeOnBackdrop = true,
  closeLabel,
  side = 'end',
} = defineProps<NuiDrawerProps>();

const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ close: [returnValue: string] }>();
const slots = useSlots();
const slotNames = computed(() => Object.keys(slots));
</script>
