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
import { useMutationObserver, useResizeObserver } from '@vueuse/core';
import { createCollection, useDirection, useListNavigation } from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import { useEdgeScroll } from '../shared/use-edge-scroll';
import { provideTabList, useTabs } from './tabs-context';
import { NuiTabsOrientation, type NuiTabListProps, type TabPlace } from './tabs.types';

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

const { label } = defineProps<NuiTabListProps>();
const tabs = useTabs();
const orientation = computed(() => tabs.orientation.value);
const listElement = useTemplateRef<HTMLElement>('list');
const rootElement = useTemplateRef<HTMLElement>('root');
const startEdge = useTemplateRef<HTMLElement>('startEdge');
const endEdge = useTemplateRef<HTMLElement>('endEdge');
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

const { markOverflow, page, follow, keepFollowed, glide } = useEdgeScroll({
  block: 'nui-tab-list',
  root: rootElement,
  track: listElement,
  startEdge,
  endEdge,
  direction,
  enabled: () => !vertical(),
});

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

const remeasure = (): void => {
  measure();
  keepFollowed();
};

const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;
  if (next instanceof Node && listElement.value?.contains(next)) {
    return;
  }

  navigation.reset();
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
  follow(selectedTab, 'instant');
  watch([() => tabs.modelValue.value, orientation], measure, { immediate: true, flush: 'post' });

  watch(
    () => tabs.modelValue.value,
    () => {
      follow(selectedTab, glide());
    },
    { flush: 'post' },
  );

  useResizeObserver(listElement, remeasure);
  useResizeObserver(tabElements, remeasure);
  useMutationObserver(listElement, collect, { childList: true, subtree: true });
});
</script>
