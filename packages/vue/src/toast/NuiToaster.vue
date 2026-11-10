<template>
  <div
    ref="region"
    role="region"
    class="nui-toaster"
    :class="[`nui-toaster--placement-${placement}`, { 'nui-toaster--expanded': expand }]"
    :style="regionStyle"
    aria-live="polite"
    :aria-label="labelText"
    v-bind="{ ...contentAttrs, ...$attrs }"
    @pointerenter="onPointerenter"
    @pointerleave="onPointerleave"
    @focusin="onFocusin"
    @focusout="onFocusout"
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
  onBeforeUnmount,
  ref,
  shallowReactive,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue';
import { useEventListener, useResizeObserver } from '@vueuse/core';
import { ToastHold, useMessages, usePopover, useToastStore, type Toast } from '@numior/primitives';
import NuiToast from './NuiToast.vue';
import { focusTargetIn, keyboardFocused, stayingNear } from './toast-focus';
import { frontSize, itemStyle, layoutStack } from './toast-stack';
import { toastMessages } from './toast.messages';
import { NuiToasterPlacement, type NuiToasterProps, type NuiToasterSlot } from './toast.types';

defineOptions({ inheritAttrs: false });

const {
  id,
  placement = NuiToasterPlacement.TopEnd,
  expand = false,
  label,
  closeLabel,
} = defineProps<NuiToasterProps>();

defineSlots<{ default(props: NuiToasterSlot): unknown }>();

const store = useToastStore();
const messages = useMessages(toastMessages);
const visible = store.visible;
const open = ref(true);
const regionElement = useTemplateRef<HTMLElement>('region');
const { contentAttrs, raise } = usePopover(regionElement, { open, id: () => id, mode: 'manual' });

const sizes = shallowReactive(new Map<string, number>());
const labelText = computed(() => label ?? messages.value.label);
const items = computed(() => layoutStack(visible.value, sizes));

const regionStyle = computed(() => {
  const front = frontSize(items.value, sizes);
  return front === undefined ? {} : { '--_front-size': `${front}px` };
});

const pageDocument = (): Document | undefined =>
  typeof document === 'undefined' ? undefined : document;

const observed = new Map<HTMLElement, string>();
const wrappers = new Map<string, HTMLElement>();
const observedElements = shallowRef<HTMLElement[]>([]);

const measure = (entries: readonly ResizeObserverEntry[]): void => {
  for (const entry of entries) {
    if (entry.target instanceof HTMLElement) {
      const toastId = observed.get(entry.target);

      if (toastId !== undefined) {
        sizes.set(toastId, entry.target.offsetHeight);
      }
    }
  }
};

useResizeObserver(observedElements, measure);

const track = (toastId: string, element: unknown): void => {
  const target = element instanceof HTMLElement ? element.firstElementChild : null;

  if (element instanceof HTMLElement) {
    wrappers.set(toastId, element);
  } else {
    wrappers.delete(toastId);
  }
  if (target instanceof HTMLElement) {
    if (!observed.has(target)) {
      observed.set(target, toastId);
      observedElements.value = [...observed.keys()];
    }
    return;
  }
  for (const [node, ownerId] of observed) {
    if (ownerId === toastId) {
      observed.delete(node);
    }
  }
  observedElements.value = [...observed.keys()];
  sizes.delete(toastId);
};

const modalOpen = (): boolean => document.querySelector('dialog[open]') !== null;

watch(
  () => store.toasts.value.length,
  (next, previous) => {
    if (next > previous && modalOpen()) {
      raise();
    }
  },
);

let origin: HTMLElement | undefined;

const focusedLeaving = (toasts: readonly Toast[]): number =>
  toasts.findIndex(
    (toast) => toast.leaving && wrappers.get(toast.id)?.contains(document.activeElement) === true,
  );

watch(visible, (toasts) => {
  const leaving = focusedLeaving(toasts);

  if (leaving === -1) {
    return;
  }
  const staying = keyboardFocused() ? stayingNear(toasts, leaving) : undefined;
  const wrapper = staying === undefined ? undefined : wrappers.get(staying.id);
  const target = (wrapper === undefined ? undefined : focusTargetIn(wrapper)) ?? origin;

  if (target?.isConnected === true) {
    target.focus();
  } else if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
});

watch(
  visible,
  (toasts) => {
    if (toasts.length === 0) {
      store.release(ToastHold.Hover);
    }
    if (regionElement.value?.contains(document.activeElement) !== true) {
      store.release(ToastHold.Focus);
    }
  },
  { flush: 'post' },
);

const onPointerenter = (): void => {
  store.hold(ToastHold.Hover);
};

const onPointerleave = (): void => {
  store.release(ToastHold.Hover);
};

const onFocusin = (event: FocusEvent): void => {
  const previous = event.relatedTarget;

  if (previous instanceof HTMLElement && regionElement.value?.contains(previous) !== true) {
    origin = previous;
  }
  store.hold(ToastHold.Focus);
};

const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;

  if (!(next instanceof Node) || regionElement.value?.contains(next) !== true) {
    store.release(ToastHold.Focus);
  }
};

const onVisibilityChange = (): void => {
  if (document.hidden) {
    store.hold(ToastHold.Hidden);
  } else {
    store.release(ToastHold.Hidden);
  }
};

useEventListener(pageDocument, 'visibilitychange', onVisibilityChange);

onBeforeUnmount(() => {
  Object.values(ToastHold).forEach(store.release);
});
</script>
