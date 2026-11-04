<template>
  <div
    ref="root"
    class="nui-date-picker"
    :class="[
      `nui-date-picker--size-${size}`,
      {
        'nui-date-picker--range': range,
        'nui-date-picker--open': popover.open.value,
        'nui-date-picker--invalid': invalid,
        'nui-date-picker--disabled': disabled,
        'nui-date-picker--readonly': readonly,
        'nui-date-picker--clearable': clearable,
      },
    ]"
    @focusout="popover.onFocusout"
  >
    <slot />
    <NuiButton
      v-if="clearable"
      variant="plain"
      size="xs"
      icon-only
      class="nui-date-picker__clear"
      :aria-label="clearLabel"
      tabindex="-1"
      icon="x"
      @click="emit('clear')"
    />
    <NuiButton
      variant="plain"
      size="xs"
      icon-only
      class="nui-date-picker__open"
      :aria-label="openLabel"
      aria-haspopup="dialog"
      :aria-expanded="popover.open.value ? 'true' : 'false'"
      :aria-controls="popover.control.id.value"
      :disabled="disabled || readonly"
      icon="calendar"
      @click="popover.toggle"
    />
    <div
      :ref="popover.setPanel"
      class="nui-date-picker__panel nui-layer"
      role="dialog"
      aria-modal="false"
      :aria-label="labelledBy ? undefined : dialogLabel"
      :aria-labelledby="labelledBy"
      v-bind="popover.control.contentAttrs.value"
      @keydown="onPanelKeydown"
    >
      <slot name="panel" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import NuiButton from '../button/NuiButton.vue';
import type { NuiSize } from '../shared/scale.types';
import type { PickerPopover } from './use-picker-popover';
import { Key } from '@numior/primitives';

defineSlots<{ default(): unknown; panel(): unknown }>();

const {
  popover,
  size,
  range = false,
  invalid = false,
  disabled = false,
  readonly = false,
  clearable = false,
  openLabel,
  clearLabel,
  dialogLabel,
  labelledBy,
} = defineProps<{
  popover: PickerPopover;
  size: NuiSize;
  range?: boolean | undefined;
  invalid?: boolean | undefined;
  disabled?: boolean | undefined;
  readonly?: boolean | undefined;
  clearable?: boolean | undefined;
  openLabel: string;
  clearLabel: string;
  dialogLabel: string;
  labelledBy?: string | undefined;
}>();

const emit = defineEmits<{ clear: [] }>();

const root = useTemplateRef<HTMLElement>('root');

const onPanelKeydown = (event: KeyboardEvent): void => {
  if (event.key === Key.Escape && !event.defaultPrevented) {
    event.preventDefault();
    popover.hide({ focus: true });
  }
};

defineExpose({ root });
</script>
