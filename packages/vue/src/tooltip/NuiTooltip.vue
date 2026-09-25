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

defineOptions({ inheritAttrs: false });

const {
  id,
  placement = 'top',
  offset = 6,
  openDelay = 300,
  closeDelay = 100,
  disabled = false,
} = defineProps<NuiTooltipProps>();

const open = defineModel<boolean>('open', { default: false });
defineSlots<{ trigger(props: NuiTooltipTriggerSlot): unknown; default(): unknown }>();
const { trigger, setTrigger } = useTriggerElement();
const contentElement = useTemplateRef<HTMLElement>('content');
const arrowNode = useTemplateRef<HTMLElement>('arrow-node');

const { contentAttrs, id: tooltipId } = usePopover(contentElement, {
  open,
  id: () => id,
  mode: 'manual',
});

useFloating(trigger, contentElement, {
  placement: () => placement,
  offset: () => offset,
  arrow: arrowNode,
  enabled: open,
});

const delay = useDelayedOpen(open, {
  openDelay: () => openDelay,
  closeDelay: () => closeDelay,
});

const pointerPressedAt = ref(0);
const POINTER_FOCUS_WINDOW = 500;

watch(
  () => disabled,
  (isDisabled) => {
    if (isDisabled) {
      delay.closeNow();
    }
  },
);

const triggerAttrs = computed<NuiTooltipTriggerAttrs>(() => ({
  'aria-describedby': disabled ? undefined : tooltipId.value,
  ref: setTrigger,
  onPointerenter: (event) => {
    if (event.pointerType !== 'touch' && !disabled) {
      delay.scheduleOpen();
    }
  },
  onPointerleave: () => delay.scheduleClose(),
  onPointerdown: () => {
    pointerPressedAt.value = Date.now();
    delay.closeNow();
  },
  onFocus: () => {
    if (!disabled && Date.now() - pointerPressedAt.value > POINTER_FOCUS_WINDOW) {
      delay.openNow();
    }
  },
  onBlur: () => delay.closeNow(),
  onKeydown: (event) => {
    if (event.key === 'Escape') {
      delay.closeNow();
    }
  },
}));
</script>
