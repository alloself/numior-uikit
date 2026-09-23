<template>
  <dialog
    :id="dialogId"
    ref="dialog"
    class="nui-dialog"
    :class="`nui-dialog--size-${size}`"
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
    <div class="nui-dialog__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="nui-dialog__footer">
      <slot name="footer" />
    </footer>
    <NuiButton
      v-if="closable"
      variant="ghost"
      tone="neutral"
      size="sm"
      icon-only
      class="nui-dialog__close"
      :aria-label="closeLabel"
      @click="control.close()"
    >
      <NuiIcon alias="x" />
    </NuiButton>
  </dialog>
</template>

<script setup lang="ts">
import { useSlots, useTemplateRef } from 'vue';
import { useDialog } from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { useDialogLabels } from './dialog-labels';
import type { NuiDialogProps } from './dialog.types';

const {
  id,
  title,
  description,
  size = 'md',
  closable = true,
  closeOnBackdrop = true,
  closeLabel = 'Close',
} = defineProps<NuiDialogProps>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ close: [returnValue: string] }>();
const slots = useSlots();
const hasTitle = () => Boolean(title || slots.title);
const hasDescription = () => Boolean(description || slots.description);
const {
  id: dialogId,
  titleId,
  descriptionId,
  labelledBy,
  describedBy,
} = useDialogLabels(() => id, { title: hasTitle, description: hasDescription });
const dialogElement = useTemplateRef<HTMLDialogElement>('dialog');
const control = useDialog(dialogElement, {
  open,
  dismissible: () => closable,
  closeOnBackdrop: () => closeOnBackdrop,
  onClose: (value) => emit('close', value),
});
</script>
