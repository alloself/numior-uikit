<template>
  <slot name="trigger" :attrs="triggerAttrs" :open="open" />
  <div
    ref="content"
    class="nui-popover nui-layer"
    :class="`nui-popover--padding-${padding}`"
    v-bind="{ ...contentAttrs, ...hover.contentAttrs.value, ...$attrs }"
  >
    <slot />
    <span v-if="arrow" ref="arrow-node" class="nui-popover__arrow"></span>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useFloating, usePopover } from '@numior/primitives';
import { useTriggerElement } from '../shared/trigger-ref';
import { useHoverTrigger } from './use-hover-trigger';
import type {
  NuiPopoverProps,
  NuiPopoverTriggerAttrs,
  NuiPopoverTriggerSlot,
} from './popover.types';

defineOptions({ inheritAttrs: false });

const {
  id,
  placement = 'bottom',
  offset = 8,
  arrow = false,
  padding = 'md',
  anchor,
  mode = 'auto',
  trigger: activation = 'click',
  openDelay = 400,
  closeDelay = 200,
} = defineProps<NuiPopoverProps>();

const open = defineModel<boolean>('open', { default: false });
defineSlots<{ trigger?(props: NuiPopoverTriggerSlot): unknown; default(): unknown }>();
const { trigger, setTrigger } = useTriggerElement();
const reference = computed(() => (anchor === undefined ? trigger.value : anchor));
const contentElement = useTemplateRef<HTMLElement>('content');
const arrowNode = useTemplateRef<HTMLElement>('arrow-node');

const hovering = (): boolean => activation === 'hover';

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
  enabled: open,
});

const triggerAttrs = computed<NuiPopoverTriggerAttrs>(() => {
  const { popovertarget, ...invoker } = invokerAttrs.value;

  return hovering()
    ? { ...invoker, ...hover.triggerAttrs.value, ref: setTrigger }
    : { ...invoker, popovertarget, ref: setTrigger };
});
</script>
