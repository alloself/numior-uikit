<template>
  <slot name="trigger" :attrs="triggerAttrs" :open="open" />
  <div
    ref="content"
    role="tooltip"
    class="nui-tooltip"
    v-bind="{ ...contentAttrs, ...$attrs }"
    @pointerenter="delay.cancel()"
    @pointerleave="delay.scheduleClose()"
  >
    <slot />
    <span ref="arrow-node" class="nui-tooltip__arrow"></span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useDelayedOpen, useFloating, usePopover } from '@numior/primitives';
import { useTriggerElement } from '../shared/trigger-ref';
import type {
  NuiTooltipProps,
  NuiTooltipTriggerAttrs,
  NuiTooltipTriggerSlot,
} from './tooltip.types';

const POINTER_FOCUS_WINDOW = 500;

defineOptions({ inheritAttrs: false });

const {
  id,
  placement = 'top',
  offset = 6,
  openDelay = 300,
  closeDelay = 100,
  disabled = false,
  anchor,
} = defineProps<NuiTooltipProps>();

const open = defineModel<boolean>('open', { default: false });

defineSlots<{ trigger?(props: NuiTooltipTriggerSlot): unknown; default(): unknown }>();

const { trigger, setTrigger } = useTriggerElement();
const contentElement = useTemplateRef<HTMLElement>('content');
const arrowNode = useTemplateRef<HTMLElement>('arrow-node');
const pointerPressedAt = ref(0);
const reference = (): HTMLElement | null => (anchor === undefined ? trigger.value : anchor);

const { contentAttrs, id: tooltipId } = usePopover(contentElement, {
  open,
  id: () => id,
  mode: 'manual',
});

useFloating(reference, contentElement, {
  placement: () => placement,
  offset: () => offset,
  arrow: arrowNode,
  enabled: open,
});

const delay = useDelayedOpen(open, {
  openDelay: () => openDelay,
  closeDelay: () => closeDelay,
});

const onPointerenter = (event: PointerEvent): void => {
  if (event.pointerType !== 'touch' && !disabled) {
    delay.scheduleOpen();
  }
};

const onPointerleave = (): void => delay.scheduleClose();

const onPointerdown = (): void => {
  pointerPressedAt.value = Date.now();
  delay.closeNow();
};

const onFocus = (): void => {
  if (!disabled && Date.now() - pointerPressedAt.value > POINTER_FOCUS_WINDOW) {
    delay.openNow();
  }
};

const onBlur = (): void => delay.closeNow();

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    delay.closeNow();
  }
};

watch(
  () => disabled,
  (isDisabled) => {
    if (isDisabled) {
      delay.closeNow();
    }
  },
);

watch(
  () => anchor,
  (element, _previous, onCleanup) => {
    if (!element) {
      return;
    }

    element.addEventListener('pointerenter', onPointerenter);
    element.addEventListener('pointerleave', onPointerleave);
    element.addEventListener('pointerdown', onPointerdown);
    element.addEventListener('focus', onFocus);
    element.addEventListener('blur', onBlur);
    element.addEventListener('keydown', onKeydown);

    onCleanup(() => {
      element.removeEventListener('pointerenter', onPointerenter);
      element.removeEventListener('pointerleave', onPointerleave);
      element.removeEventListener('pointerdown', onPointerdown);
      element.removeEventListener('focus', onFocus);
      element.removeEventListener('blur', onBlur);
      element.removeEventListener('keydown', onKeydown);
    });
  },
  { immediate: true },
);

const triggerAttrs = computed<NuiTooltipTriggerAttrs>(() => ({
  'aria-describedby': disabled ? undefined : tooltipId.value,
  ref: setTrigger,
  onPointerenter,
  onPointerleave,
  onPointerdown,
  onFocus,
  onBlur,
  onKeydown,
}));
</script>
