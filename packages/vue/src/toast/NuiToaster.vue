<template>
  <div
    ref="region"
    role="region"
    class="nui-toaster"
    :class="[`nui-toaster--placement-${placement}`, { 'nui-toaster--expanded': expand }]"
    :style="regionStyle"
    aria-live="polite"
    :aria-label="label"
    v-bind="{ ...contentAttrs, ...$attrs }"
    @pointerenter="pauseAll"
    @pointerleave="resumeAll"
    @focusin="pauseAll"
    @focusout="resumeAll"
  >
    <div
      v-for="item in items"
      :key="item.toast.id"
      :ref="(element) => track(item.toast.id, element)"
      class="nui-toaster__item"
      :class="{
        'nui-toaster__item--behind': item.index > 0,
        'nui-toaster__item--leaving': item.toast.leaving,
      }"
      :style="itemStyle(item, sizes.get(item.toast.id))"
    >
      <slot :toast="item.toast" :dismiss="() => store.dismiss(item.toast.id)">
        <NuiToast :toast="item.toast" :close-label="closeLabel" />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onMounted,
  onScopeDispose,
  ref,
  shallowReactive,
  useTemplateRef,
  watch,
} from 'vue';
import { usePopover, useToastStore } from '@numior/primitives';
import NuiToast from './NuiToast.vue';
import { frontSize, itemStyle, layoutStack } from './toast-stack';
import type { NuiToasterProps, NuiToasterSlot } from './toast.types';

defineOptions({ inheritAttrs: false });
const {
  id,
  placement = 'top-end',
  expand = false,
  label = 'Notifications',
  closeLabel = 'Close',
} = defineProps<NuiToasterProps>();
defineSlots<{ default(props: NuiToasterSlot): unknown }>();
const store = useToastStore();
const visible = store.visible;
const open = ref(true);
const regionElement = useTemplateRef<HTMLElement>('region');
const { contentAttrs, raise } = usePopover(regionElement, { open, id: () => id, mode: 'manual' });

const sizes = shallowReactive(new Map<string, number>());
const items = computed(() => layoutStack(visible.value, sizes));
const regionStyle = computed(() => {
  const front = frontSize(items.value, sizes);
  return front === undefined ? {} : { '--_front-size': `${front}px` };
});

const observed = new Map<Element, string>();
const measure = (entries: readonly ResizeObserverEntry[]): void => {
  for (const entry of entries) {
    const toastId = observed.get(entry.target);
    if (toastId !== undefined && entry.target instanceof HTMLElement) {
      sizes.set(toastId, entry.target.offsetHeight);
    }
  }
};
const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
const track = (toastId: string, element: unknown): void => {
  const target = element instanceof HTMLElement ? element.firstElementChild : null;
  if (target) {
    if (!observed.has(target)) {
      observed.set(target, toastId);
      observer?.observe(target);
    }
    return;
  }
  for (const [node, ownerId] of observed) {
    if (ownerId === toastId) {
      observer?.unobserve(node);
      observed.delete(node);
    }
  }
  sizes.delete(toastId);
};
onScopeDispose(() => observer?.disconnect());

const modalOpen = (): boolean => document.querySelector('dialog[open]') !== null;
watch(
  () => store.toasts.value.length,
  (next, previous) => {
    if (next > previous && modalOpen()) {
      raise();
    }
  },
);

const applyToVisible = (apply: (toastId: string) => void): void => {
  for (const toast of visible.value) {
    apply(toast.id);
  }
};
const pauseAll = (): void => applyToVisible(store.pause);
const resumeAll = (): void => applyToVisible(store.resume);
const onVisibilityChange = (): void => {
  if (document.hidden) {
    pauseAll();
  } else {
    resumeAll();
  }
};
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange);
  onScopeDispose(() => document.removeEventListener('visibilitychange', onVisibilityChange));
});
</script>
