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
    <slot :target="targeted.target.value" />
    <span ref="arrow-node" class="nui-tooltip__arrow"></span>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useDelayedOpen, useFloating, usePopover } from '@numior/primitives';
import { useTriggerElement } from '../shared/trigger-ref';
import type {
  NuiTooltipContentSlot,
  NuiTooltipTargetsAttrs,
  NuiTooltipProps,
  NuiTooltipTargets,
  NuiTooltipTriggerAttrs,
  NuiTooltipTriggerSlot,
} from './tooltip.types';
import { useTooltipTargets } from './use-tooltip-targets';

const POINTER_FOCUS_WINDOW = 500;

const isTargets = (
  value: HTMLElement | NuiTooltipTargets | null | undefined,
): value is NuiTooltipTargets => value !== null && value !== undefined && 'selector' in value;

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

defineSlots<{
  trigger?(props: NuiTooltipTriggerSlot): unknown;
  default(props: NuiTooltipContentSlot): unknown;
}>();

const { trigger, setTrigger } = useTriggerElement();
const contentElement = useTemplateRef<HTMLElement>('content');
const arrowNode = useTemplateRef<HTMLElement>('arrow-node');
const pointerPressedAt = ref(0);
const targets = computed(() => (isTargets(anchor) ? anchor : undefined));
const anchorElement = computed(() => (isTargets(anchor) ? undefined : anchor));
const container = computed(() => targets.value?.within);

const { contentAttrs, id: tooltipId } = usePopover(contentElement, {
  open,
  id: () => id,
  mode: 'manual',
});

const pressedRecently = (): boolean => Date.now() - pointerPressedAt.value <= POINTER_FOCUS_WINDOW;

const delay = useDelayedOpen(open, {
  openDelay: () => openDelay,
  closeDelay: () => closeDelay,
});

const targeted = useTooltipTargets({
  selector: () => targets.value?.selector,
  root: computed(() => container.value ?? trigger.value),
  open,
  disabled: () => disabled,
  delay,
  describedBy: tooltipId,
  pressedRecently,
  onPress: () => {
    pointerPressedAt.value = Date.now();
  },
});

const reference = (): HTMLElement | null => {
  if (targets.value !== undefined) {
    return targeted.target.value;
  }
  return anchorElement.value === undefined ? trigger.value : anchorElement.value;
};

useFloating(reference, contentElement, {
  placement: () => placement,
  offset: () => offset,
  arrow: arrowNode,
  enabled: open,
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
  if (!disabled && !pressedRecently()) {
    delay.openNow();
  }
};

const onBlur = (): void => delay.closeNow();

const onDocumentKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    delay.closeNow();
  }
};

const openDocument = (): Document | undefined =>
  open.value && typeof document !== 'undefined' ? document : undefined;

watch(
  () => disabled,
  (isDisabled) => {
    if (isDisabled) {
      delay.closeNow();
    }
  },
);

useEventListener(anchorElement, 'pointerenter', onPointerenter);
useEventListener(anchorElement, 'pointerleave', onPointerleave);
useEventListener(anchorElement, 'pointerdown', onPointerdown);
useEventListener(anchorElement, 'focus', onFocus);
useEventListener(anchorElement, 'blur', onBlur);
useEventListener(openDocument, 'keydown', onDocumentKeydown);
useEventListener(container, 'pointerover', targeted.onPointerover);
useEventListener(container, 'pointerout', targeted.onPointerout);
useEventListener(container, 'pointerdown', targeted.onPointerdown);
useEventListener(container, 'focusin', targeted.onFocusin);
useEventListener(container, 'focusout', targeted.onFocusout);

const targetsAttrs: NuiTooltipTargetsAttrs = {
  ref: setTrigger,
  onPointerover: targeted.onPointerover,
  onPointerout: targeted.onPointerout,
  onPointerdown: targeted.onPointerdown,
  onFocusin: targeted.onFocusin,
  onFocusout: targeted.onFocusout,
};

const triggerAttrs = computed<NuiTooltipTriggerAttrs | NuiTooltipTargetsAttrs>(() =>
  targets.value === undefined
    ? {
        'aria-describedby': disabled ? undefined : tooltipId.value,
        ref: setTrigger,
        onPointerenter,
        onPointerleave,
        onPointerdown,
        onFocus,
        onBlur,
      }
    : targetsAttrs,
);
</script>
