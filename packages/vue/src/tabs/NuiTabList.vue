<template>
  <div
    ref="list"
    role="tablist"
    class="nui-tab-list"
    :class="`nui-tab-list--orientation-${orientation}`"
    :aria-orientation="orientation"
    :aria-label="label"
    :style="indicatorStyle"
    @keydown="navigation.onKeydown"
    @focusin="navigation.onFocusin"
    @focusout="onFocusout"
  >
    <slot />
    <span class="nui-tab-list__indicator" aria-hidden="true"></span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, useTemplateRef, watch } from 'vue';
import { useListNavigation } from '@numior/primitives';
import { useTabs } from './tabs-context';
import type { NuiTabListProps } from './tabs.types';

const { label } = defineProps<NuiTabListProps>();
const tabs = useTabs();
const orientation = computed(() => tabs.orientation.value);
const listElement = useTemplateRef<HTMLElement>('list');
const indicator = ref<{ start: number; size: number } | null>(null);

const indicatorStyle = computed(() =>
  indicator.value === null
    ? {}
    : {
        '--_indicator-start': `${indicator.value.start}px`,
        '--_indicator-size': `${indicator.value.size}px`,
      },
);

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
  const tab = selectedTab();
  if (!tab) {
    indicator.value = null;
    return;
  }

  indicator.value =
    orientation.value === 'vertical'
      ? { start: tab.offsetTop, size: tab.offsetHeight }
      : { start: tab.offsetLeft, size: tab.offsetWidth };
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
  if (typeof ResizeObserver === 'undefined' || !listElement.value) {
    return;
  }
  const observer = new ResizeObserver(measure);
  observer.observe(listElement.value);
  onScopeDispose(() => observer.disconnect());
});
</script>
