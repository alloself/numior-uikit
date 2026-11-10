<template>
  <div ref="root" class="nui-tab-list" :class="`nui-tab-list--orientation-${orientation}`">
    <span
      ref="startEdge"
      class="nui-tab-list__edge nui-tab-list__edge--start"
      aria-hidden="true"
      @mousedown.prevent
    >
      <NuiButton
        variant="ghost"
        tone="neutral"
        size="sm"
        icon="chevron-left"
        class="nui-tab-list__scroll"
        tabindex="-1"
        @click="page(-1)"
      />
    </span>
    <div ref="list" class="nui-tab-list__track" v-bind="roleAttrs">
      <slot />
      <span class="nui-tab-list__indicator" aria-hidden="true"></span>
    </div>
    <span
      ref="endEdge"
      class="nui-tab-list__edge nui-tab-list__edge--end"
      aria-hidden="true"
      @mousedown.prevent
    >
      <NuiButton
        variant="ghost"
        tone="neutral"
        size="sm"
        icon="chevron-right"
        class="nui-tab-list__scroll"
        tabindex="-1"
        @click="page(1)"
      />
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue';
import {
  useEventListener,
  useMediaQuery,
  useMutationObserver,
  useResizeObserver,
} from '@vueuse/core';
import { createCollection, useDirection, useListNavigation } from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import { provideTabList, useTabs } from './tabs-context';
import {
  NuiTabsOrientation,
  type NuiTabListProps,
  type TabOverflow,
  type TabPlace,
} from './tabs.types';

const EDGE_SLACK = 1;
const PAGE_SHARE = 0.8;
const WHEEL_LINE = 16;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

const scaleOf = (layout: number, painted: number): number =>
  painted === 0 || Math.abs(layout - painted) < 1 ? 1 : layout / painted;

const placeOf = (
  list: HTMLElement,
  tab: HTMLElement,
  vertical: boolean,
  rtl: boolean,
): TabPlace => {
  const frame = list.getBoundingClientRect();
  const box = tab.getBoundingClientRect();

  if (vertical) {
    const scale = scaleOf(list.offsetHeight, frame.height);

    return {
      start: (box.top - frame.top) * scale - list.clientTop + list.scrollTop,
      size: box.height * scale,
    };
  }

  const scale = scaleOf(list.offsetWidth, frame.width);
  const left = (box.left - frame.left) * scale - list.clientLeft + list.scrollLeft;
  const size = box.width * scale;

  return { start: rtl ? list.clientWidth - left - size : left, size };
};

const overflowOf = (list: HTMLElement): TabOverflow => {
  const start = Math.abs(list.scrollLeft);

  return {
    start: start > EDGE_SLACK,
    end: list.scrollWidth - list.clientWidth - start > EDGE_SLACK,
  };
};

const hiddenPart = (list: HTMLElement, tab: HTMLElement): number => {
  const frame = list.getBoundingClientRect();
  const box = tab.getBoundingClientRect();
  const margin = Number.parseFloat(getComputedStyle(list).scrollPaddingInlineStart) || 0;

  if (box.left < frame.left) {
    return box.left - frame.left - margin;
  }
  return box.right > frame.right ? box.right - frame.right + margin : 0;
};

const wheelPixels = (event: WheelEvent): number =>
  event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * WHEEL_LINE : event.deltaY;

const { label } = defineProps<NuiTabListProps>();
const tabs = useTabs();
const orientation = computed(() => tabs.orientation.value);
const listElement = useTemplateRef<HTMLElement>('list');
const rootElement = useTemplateRef<HTMLElement>('root');
const startEdge = useTemplateRef<HTMLElement>('startEdge');
const endEdge = useTemplateRef<HTMLElement>('endEdge');
const reducedMotion = useMediaQuery(REDUCED_MOTION);
const direction = useDirection(listElement);
const tabElements = shallowRef<HTMLElement[]>([]);
const items = createCollection<string>();
let seenTabs: readonly HTMLElement[] = [];

const selectedTab = (): HTMLElement | undefined => {
  const value = tabs.modelValue.value;

  return value === undefined ? undefined : items.get(value);
};

const collect = (): void => {
  const found = items.elements();

  if (found === seenTabs) {
    return;
  }

  seenTabs = found;
  tabElements.value = [...found];
};

const navigation = useListNavigation(listElement, {
  items: items.elements,
  orientation,
  loop: true,
  typeahead: false,
  resting: selectedTab,
});

const vertical = (): boolean => orientation.value === NuiTabsOrientation.Vertical;

const markOverflow = (): void => {
  const list = listElement.value;

  if (!list) {
    return;
  }
  const hidden = vertical() ? { start: false, end: false } : overflowOf(list);

  list.classList.toggle('nui-tab-list__track--clipped-start', hidden.start);
  list.classList.toggle('nui-tab-list__track--clipped-end', hidden.end);
  startEdge.value?.classList.toggle('nui-tab-list__edge--shown', hidden.start);
  endEdge.value?.classList.toggle('nui-tab-list__edge--shown', hidden.end);
};

const glide = (): ScrollBehavior => (reducedMotion.value ? 'instant' : 'smooth');

const scrollTrack = (left: number, behavior: ScrollBehavior): void => {
  listElement.value?.scrollBy({ left, behavior });
};

const page = (steps: number): void => {
  const list = listElement.value;

  if (!list) {
    return;
  }

  const sign = direction.isRtl() ? -steps : steps;

  scrollTrack(sign * list.clientWidth * PAGE_SHARE, glide());
};

const reveal = (behavior: ScrollBehavior): void => {
  const list = listElement.value;
  const tab = selectedTab();

  if (!list || !tab || vertical()) {
    return;
  }
  const hidden = hiddenPart(list, tab);

  if (hidden !== 0) {
    scrollTrack(hidden, behavior);
  }
};

const onWheel = (event: WheelEvent): void => {
  const list = listElement.value;

  const skipped = vertical() || event.shiftKey || event.ctrlKey || event.deltaX !== 0;

  if (!list || skipped || list.scrollWidth - list.clientWidth <= EDGE_SLACK) {
    return;
  }
  const before = list.scrollLeft;

  scrollTrack(direction.isRtl() ? -wheelPixels(event) : wheelPixels(event), 'instant');

  if (list.scrollLeft !== before) {
    event.preventDefault();
  }
};

const measure = (): void => {
  const list = listElement.value;
  const tab = selectedTab();

  if (!list) {
    return;
  }
  markOverflow();

  if (!tab) {
    list.style.removeProperty('--_indicator-start');
    list.style.removeProperty('--_indicator-size');

    return;
  }

  const place = placeOf(list, tab, vertical(), direction.isRtl());

  list.style.setProperty('--_indicator-start', `${String(place.start)}px`);
  list.style.setProperty('--_indicator-size', `${String(place.size)}px`);
};

const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;
  if (!(next instanceof Node && listElement.value?.contains(next))) {
    navigation.reset();
  }
};

const roleAttrs = computed(() =>
  tabs.navigation.value
    ? {}
    : {
        role: 'tablist',
        'aria-orientation': orientation.value,
        'aria-label': label,
        onKeydown: navigation.onKeydown,
        onFocusin: navigation.onFocusin,
        onFocusout,
      },
);

provideTabList({
  tabs: items,
  restoreFocus: () => {
    (selectedTab() ?? items.elements()[0])?.focus();
  },
});

onMounted(() => {
  if (!tabs.navigation.value) {
    navigation.reset();
  }
  collect();
  reveal('instant');
  watch([() => tabs.modelValue.value, orientation], measure, { immediate: true, flush: 'post' });

  watch(
    () => tabs.modelValue.value,
    () => {
      reveal(glide());
    },
    { flush: 'post' },
  );

  useEventListener(listElement, 'scroll', markOverflow, { passive: true });
  useEventListener(rootElement, 'wheel', onWheel, { passive: false });
  useResizeObserver(listElement, measure);
  useResizeObserver(tabElements, measure);
  useMutationObserver(listElement, collect, { childList: true, subtree: true });
});
</script>
