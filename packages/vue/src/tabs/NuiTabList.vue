<template>
  <div
    ref="list"
    role="tablist"
    class="nui-tab-list"
    :class="`nui-tab-list--orientation-${orientation}`"
    :aria-orientation="orientation"
    :aria-label="label"
    @keydown="navigation.onKeydown"
    @focusin="navigation.onFocusin"
    @focusout="onFocusout"
  >
    <slot />
    <span class="nui-tab-list__indicator" aria-hidden="true"></span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue';
import { useMutationObserver, useResizeObserver } from '@vueuse/core';
import { useListNavigation } from '@numior/primitives';
import { provideTabList, useTabs } from './tabs-context';
import type { NuiTabListProps } from './tabs.types';

const TAB = '[role="tab"]';

const tabsOf = (list: HTMLElement | null): HTMLElement[] =>
  Array.from(list?.querySelectorAll<HTMLElement>(TAB) ?? []);

const inlineStartOf = (list: HTMLElement, tab: HTMLElement): number =>
  getComputedStyle(list).direction === 'rtl'
    ? list.clientWidth - tab.offsetLeft - tab.offsetWidth
    : tab.offsetLeft;

const { label } = defineProps<NuiTabListProps>();
const tabs = useTabs();
const orientation = computed(() => tabs.orientation.value);
const listElement = useTemplateRef<HTMLElement>('list');
const tabElements = shallowRef<HTMLElement[]>([]);

const selectedTab = (): HTMLElement | null => {
  const found = listElement.value?.querySelector(`${TAB}[aria-selected="true"]`);
  return found instanceof HTMLElement ? found : null;
};

const collect = (): void => {
  const found = tabsOf(listElement.value);
  const known = tabElements.value;

  if (found.length !== known.length || found.some((tab, index) => tab !== known[index])) {
    tabElements.value = found;
  }
};

const navigation = useListNavigation(listElement, {
  selector: TAB,
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

  const vertical = orientation.value === 'vertical';

  list.style.setProperty(
    '--_indicator-start',
    `${vertical ? tab.offsetTop : inlineStartOf(list, tab)}px`,
  );

  list.style.setProperty('--_indicator-size', `${vertical ? tab.offsetHeight : tab.offsetWidth}px`);
};

const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;
  if (!(next instanceof Node && listElement.value?.contains(next))) {
    navigation.reset();
  }
};

provideTabList({
  restoreFocus: () => {
    (selectedTab() ?? tabsOf(listElement.value)[0])?.focus();
  },
});

onMounted(() => {
  navigation.reset();
  collect();
  watch([() => tabs.modelValue.value, orientation], measure, { immediate: true, flush: 'post' });
  useResizeObserver(listElement, measure);
  useResizeObserver(tabElements, measure);
  useMutationObserver(listElement, collect, { childList: true, subtree: true });
});
</script>
