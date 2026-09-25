<template>
  <button
    ref="trigger"
    :id="triggerId"
    type="button"
    role="menuitem"
    aria-haspopup="menu"
    :aria-expanded="open ? 'true' : 'false'"
    :aria-controls="control.id.value"
    tabindex="-1"
    class="nui-menu-item nui-menu-item--sub"
    :class="{ 'nui-menu-item--disabled': disabled, 'nui-menu-item--open': open }"
    :aria-disabled="disabled || undefined"
    @pointerenter="onTriggerEnter"
    @pointerleave="delay.scheduleClose()"
    @click="openFromPointer"
    @keydown="onTriggerKeydown"
    @focusout="onTriggerFocusout"
  >
    <NuiMenuRow :icon="icon">
      <slot name="label">{{ label }}</slot>
      <template #trailing>
        <NuiIcon alias="chevron-right" class="nui-menu-item__chevron" />
      </template>
    </NuiMenuRow>
  </button>
  <div
    ref="content"
    role="menu"
    tabindex="-1"
    class="nui-menu nui-menu--sub"
    :aria-labelledby="triggerId"
    v-bind="{ ...contentAttrs, ...surfaceAttrs }"
    @keydown="onContentKeydown"
    @pointerenter="delay.cancel()"
    @pointerleave="delay.scheduleClose()"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useControlId, useDelayedOpen, useDirection } from '@numior/primitives';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiMenuRow from './NuiMenuRow.vue';
import { provideMenu, useMenu } from './menu-context';
import { useMenuSurface } from './use-menu-surface';
import type { NuiMenuSubProps } from './menu.types';

const {
  id,
  label,
  icon,
  disabled = false,
  openDelay = 100,
  closeDelay = 300,
} = defineProps<NuiMenuSubProps>();

defineSlots<{ label(): unknown; default(): unknown }>();

const parent = useMenu();
const open = ref(false);
const triggerElement = useTemplateRef<HTMLElement>('trigger');
const direction = useDirection(triggerElement);
const contentElement = useTemplateRef<HTMLElement>('content');
const triggerId = useControlId(() => (id === undefined ? undefined : `${id}-trigger`));

const delay = useDelayedOpen(open, {
  openDelay: () => openDelay,
  closeDelay: () => closeDelay,
});

const {
  control,
  context,
  attrs: surfaceAttrs,
} = useMenuSurface({
  open,
  id: () => id,
  trigger: triggerElement,
  content: contentElement,
  placement: () => (direction.isRtl() ? 'left-start' : 'right-start'),
  offset: -4,
  size: { fitHeight: true },
  loop: true,
  typeahead: true,
  closeOnSelect: parent.closeOnSelect,
  parent,
  close: () => delay.closeNow(),
});

provideMenu(context);
const contentAttrs = control.contentAttrs;
const forwardKey = (): string => (direction.isRtl() ? 'ArrowLeft' : 'ArrowRight');
const backKey = (): string => (direction.isRtl() ? 'ArrowRight' : 'ArrowLeft');

const onTriggerEnter = (): void => {
  if (!disabled) {
    delay.scheduleOpen();
  }
};

const openFromPointer = (): void => {
  if (!disabled) {
    delay.openNow();
  }
};

const onTriggerKeydown = (event: KeyboardEvent): void => {
  const opens = event.key === forwardKey() || event.key === 'Enter' || event.key === ' ';
  if (!opens || disabled) {
    return;
  }
  event.preventDefault();
  context.requestFocus('first');
  delay.openNow();
};

const onTriggerFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;
  if (!(next instanceof Node && contentElement.value?.contains(next))) {
    delay.scheduleClose();
  }
};

const onContentKeydown = (event: KeyboardEvent): void => {
  event.stopPropagation();
  if (event.key === backKey()) {
    event.preventDefault();
    delay.closeNow();
    triggerElement.value?.focus({ preventScroll: true });
    return;
  }
  surfaceAttrs.onKeydown(event);
};
</script>
