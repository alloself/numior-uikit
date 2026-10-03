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
import { computed, onMounted, useTemplateRef, watch } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { useListNavigation } from '@numior/primitives';
import { useTabs } from './tabs-context';
import type { NuiTabListProps } from './tabs.types';

const inlineStartOf = (list: HTMLElement, tab: HTMLElement): number =>
  getComputedStyle(list).direction === 'rtl'
    ? list.clientWidth - tab.offsetLeft - tab.offsetWidth
    : tab.offsetLeft;

const { label } = defineProps<NuiTabListProps>();
const tabs = useTabs();
const orientation = computed(() => tabs.orientation.value);
const listElement = useTemplateRef<HTMLElement>('list');

const selectedTab = (): HTMLElement | null => {
  const found = listElement.value?.querySelector('[role="tab"][aria-selected="true"]');
  return found instanceof HTMLElement ? found : null;
};

const navigation = useListNavigation(listElement, {
  selector: '[role="tab"]',
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

onMounted(() => {
  navigation.reset();
  watch([() => tabs.modelValue.value, orientation], measure, { immediate: true, flush: 'post' });
  useResizeObserver(listElement, measure);
});
</script>
