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
    :class="`nui-menu--side-${side}`"
    :style="floatingStyles"
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
import { computed, onMounted, ref, useTemplateRef } from 'vue';
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
const rtl = ref(false);
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
  floating,
  context,
  attrs: surfaceAttrs,
} = useMenuSurface({
  open,
  id: () => id,
  trigger: triggerElement,
  content: contentElement,
  placement: () => (rtl.value ? 'left-start' : 'right-start'),
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
const { side, floatingStyles } = floating;
const forwardKey = computed(() => (rtl.value ? 'ArrowLeft' : 'ArrowRight'));
const backKey = computed(() => (rtl.value ? 'ArrowRight' : 'ArrowLeft'));

onMounted(() => {
  rtl.value = direction.isRtl();
});

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
  const opens = event.key === forwardKey.value || event.key === 'Enter' || event.key === ' ';
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
  if (event.key === backKey.value) {
    event.preventDefault();
    delay.closeNow();
    triggerElement.value?.focus({ preventScroll: true });
    return;
  }
  surfaceAttrs.onKeydown(event);
};
</script>
