<template>
  <dialog
    :id="dialogId"
    ref="dialog"
    class="nui-dialog nui-layer"
    :class="[
      `nui-dialog--size-${size}`,
      `nui-dialog--placement-${placement}`,
      { 'nui-dialog--covered': control.covered.value, 'nui-dialog--bare': bare },
    ]"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    v-bind="control.attrs"
  >
    <header v-if="hasTitle() || hasDescription()" class="nui-dialog__header">
      <h2 v-if="hasTitle()" :id="titleId" class="nui-dialog__title">
        <slot name="title">{{ title }}</slot>
      </h2>
      <p v-if="hasDescription()" :id="descriptionId" class="nui-dialog__description">
        <slot name="description">{{ description }}</slot>
      </p>
    </header>
    <div v-if="$slots.default" class="nui-dialog__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="nui-dialog__footer">
      <slot name="footer" />
    </footer>
    <NuiButton
      v-if="closable && !bare"
      variant="ghost"
      tone="neutral"
      size="sm"
      class="nui-dialog__close"
      :aria-label="closeText"
      icon="x"
      @click="control.close()"
    />
  </dialog>
</template>

<script setup lang="ts">
import { computed, useSlots, useTemplateRef } from 'vue';
import { useDialog, useMessages } from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import { useDialogLabels } from './dialog-labels';
import { dialogMessages } from './dialog.messages';
import { NuiDialogPlacement, NuiDialogSize, type NuiDialogProps } from './dialog.types';

const {
  id,
  placement = NuiDialogPlacement.Center,
  bare = false,
  title,
  description,
  size = NuiDialogSize.Md,
  closable = true,
  closeOnBackdrop = true,
  closeLabel,
} = defineProps<NuiDialogProps>();

const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ close: [returnValue: string] }>();

const slots = useSlots();
const messages = useMessages(dialogMessages);
const dialogElement = useTemplateRef<HTMLDialogElement>('dialog');

const closeText = computed(() => closeLabel ?? messages.value.close);
const hasTitle = () => Boolean(title || slots.title);
const hasDescription = () => Boolean(description || slots.description);

const {
  id: dialogId,
  titleId,
  descriptionId,
  labelledBy,
  describedBy,
} = useDialogLabels(() => id, { title: hasTitle, description: hasDescription });

const control = useDialog(dialogElement, {
  open,
  dismissible: () => closable,
  closeOnBackdrop: () => closeOnBackdrop,
  onClose: (value) => emit('close', value),
});
</script>
