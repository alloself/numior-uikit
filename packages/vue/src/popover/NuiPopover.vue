<template>
  <slot name="trigger" :attrs="triggerAttrs" :open="open" />
  <div
    ref="content"
    class="nui-popover nui-layer"
    :class="[
      `nui-popover--padding-${padding}`,
      `nui-popover--size-${size}`,
      { 'nui-popover--fit': fit },
    ]"
    v-bind="{ ...contentAttrs, ...hover.contentAttrs.value, ...$attrs }"
  >
    <slot v-if="!lazy || opened" />
    <span v-if="arrow" ref="arrow-node" class="nui-popover__arrow"></span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { FloatingPlacement, PopoverMode, useFloating, usePopover } from '@numior/primitives';
import { useTriggerElement } from '../shared/trigger-ref';
import { useHoverTrigger } from './use-hover-trigger';
import {
  NuiPopoverPadding,
  NuiPopoverSize,
  NuiPopoverTrigger,
  type NuiPopoverProps,
  type NuiPopoverTriggerAttrs,
  type NuiPopoverTriggerSlot,
} from './popover.types';

defineOptions({ inheritAttrs: false });

const {
  id,
  placement = FloatingPlacement.Bottom,
  offset = 8,
  arrow = false,
  padding = NuiPopoverPadding.Md,
  size = NuiPopoverSize.Md,
  anchor,
  mode = PopoverMode.Auto,
  trigger: activation = NuiPopoverTrigger.Click,
  openDelay = 400,
  closeDelay = 200,
  lazy = false,
  fit = false,
} = defineProps<NuiPopoverProps>();

const open = defineModel<boolean>('open', { default: false });
const opened = ref(open.value);
defineSlots<{ trigger?(props: NuiPopoverTriggerSlot): unknown; default(): unknown }>();
const { trigger, setTrigger } = useTriggerElement();
const reference = computed(() => (anchor === undefined ? trigger.value : anchor));
const contentElement = useTemplateRef<HTMLElement>('content');
const arrowNode = useTemplateRef<HTMLElement>('arrow-node');

const hovering = (): boolean => activation === NuiPopoverTrigger.Hover;

const { contentAttrs, invokerAttrs } = usePopover(contentElement, {
  open,
  id: () => id,
  mode: () => (hovering() ? 'manual' : mode),
});

const hover = useHoverTrigger({
  open,
  enabled: hovering,
  openDelay: () => openDelay,
  closeDelay: () => closeDelay,
  content: () => contentElement.value,
  trigger: () => trigger.value,
});

useFloating(reference, contentElement, {
  placement: () => placement,
  offset: () => offset,
  arrow: arrowNode,
  size: () => (fit ? { fitHeight: true } : undefined),
  enabled: open,
});

const triggerAttrs = computed<NuiPopoverTriggerAttrs>(() => {
  const { popovertarget, ...invoker } = invokerAttrs.value;

  return hovering()
    ? { ...invoker, ...hover.triggerAttrs.value, ref: setTrigger }
    : { ...invoker, popovertarget, ref: setTrigger };
});

watch(open, (value) => {
  opened.value ||= value;
});
</script>
