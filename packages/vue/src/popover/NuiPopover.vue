<template>
  <slot name="trigger" :attrs="triggerAttrs" :open="open" />
  <div
    ref="content"
    class="nui-popover"
    :class="`nui-popover--side-${side}`"
    :style="floatingStyles"
    v-bind="{ ...contentAttrs, ...$attrs }"
  >
    <slot />
    <span v-if="arrow" ref="arrow-node" class="nui-popover__arrow" :style="arrowStyles"></span>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useFloating, usePopover } from '@numior/primitives';
import { useTriggerElement } from '../shared/trigger-ref';
import type {
  NuiPopoverProps,
  NuiPopoverTriggerAttrs,
  NuiPopoverTriggerSlot,
} from './popover.types';

defineOptions({ inheritAttrs: false });
const { id, placement = 'bottom', offset = 8, arrow = false } = defineProps<NuiPopoverProps>();
const open = defineModel<boolean>('open', { default: false });
defineSlots<{ trigger(props: NuiPopoverTriggerSlot): unknown; default(): unknown }>();
const { trigger, setTrigger } = useTriggerElement();
const contentElement = useTemplateRef<HTMLElement>('content');
const arrowNode = useTemplateRef<HTMLElement>('arrow-node');
const { contentAttrs, invokerAttrs } = usePopover(contentElement, { open, id: () => id });
const { side, floatingStyles, arrowStyles } = useFloating(trigger, contentElement, {
  placement: () => placement,
  offset: () => offset,
  arrow: arrowNode,
  enabled: open,
});
const triggerAttrs = computed<NuiPopoverTriggerAttrs>(() => ({
  ...invokerAttrs.value,
  ref: setTrigger,
}));
</script>
