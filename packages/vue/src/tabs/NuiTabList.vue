<template>
  <div
    ref="list"
    class="nui-tab-list"
    :class="`nui-tab-list--orientation-${orientation}`"
    v-bind="roleAttrs"
  >
    <slot />
    <span class="nui-tab-list__indicator" aria-hidden="true"></span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue';
import { useMutationObserver, useResizeObserver } from '@vueuse/core';
import { createCollection, useDirection, useListNavigation } from '@numior/primitives';
import { provideTabList, useTabs } from './tabs-context';
import { NuiTabsOrientation, type NuiTabListProps } from './tabs.types';

const inlineStartOf = (list: HTMLElement, tab: HTMLElement, rtl: boolean): number =>
  rtl ? list.clientWidth - tab.offsetLeft - tab.offsetWidth : tab.offsetLeft;

const { label } = defineProps<NuiTabListProps>();
const tabs = useTabs();
const orientation = computed(() => tabs.orientation.value);
const listElement = useTemplateRef<HTMLElement>('list');
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

  if (found !== seenTabs) {
    seenTabs = found;
    tabElements.value = [...found];
  }
};

const navigation = useListNavigation(listElement, {
  items: items.elements,
  orientation,
  loop: true,
  typeahead: false,
  resting: selectedTab,
});

const measure = (): void => {
  const list = listElement.value;
  const tab = selectedTab();

  if (!list) {
    return;
  }

  if (!tab) {
    list.style.removeProperty('--_indicator-start');
    list.style.removeProperty('--_indicator-size');

    return;
  }

  const vertical = orientation.value === NuiTabsOrientation.Vertical;

  list.style.setProperty(
    '--_indicator-start',
    `${vertical ? tab.offsetTop : inlineStartOf(list, tab, direction.isRtl())}px`,
  );

  list.style.setProperty('--_indicator-size', `${vertical ? tab.offsetHeight : tab.offsetWidth}px`);
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
  watch([() => tabs.modelValue.value, orientation], measure, { immediate: true, flush: 'post' });
  useResizeObserver(listElement, measure);
  useResizeObserver(tabElements, measure);
  useMutationObserver(listElement, collect, { childList: true, subtree: true });
});
</script>
