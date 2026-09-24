<template>
  <div
    v-if="items && items.length === 0"
    class="nui-list nui-list--empty"
    :class="`nui-list--variant-${variant}`"
  >
    <slot name="empty"><NuiEmpty size="sm" :title="emptyLabel" /></slot>
  </div>
  <component
    :is="as"
    v-else
    ref="list"
    class="nui-list"
    :class="[
      `nui-list--variant-${variant}`,
      `nui-list--size-${size}`,
      { 'nui-list--selectable': selectable !== undefined },
    ]"
    :role="selectable ? 'listbox' : undefined"
    :aria-multiselectable="selectable === 'multiple' || undefined"
    :aria-label="label"
    @keydown="onKeydown"
    @focusin="onFocusin"
    @focusout="onFocusout"
  >
    <NuiListEntries v-if="items" :items="items" :link-as="linkAs">
      <template #item="slot"><slot name="item" v-bind="slot" /></template>
    </NuiListEntries>
    <slot />
  </component>
</template>

<script setup lang="ts" generic="T">
import { computed, onMounted, useTemplateRef, watch } from 'vue';
import { useListNavigation } from '@numior/primitives';
import NuiEmpty from '../empty/NuiEmpty.vue';
import { useOptionSelection } from '../shared/use-option-selection';
import NuiListEntries from './NuiListEntries.vue';
import { provideList } from './list-context';
import type { NuiListEntry, NuiListProps } from './list.types';

const {
  as = 'ul',
  variant = 'plain',
  size = 'md',
  items,
  selectable,
  getKey,
  loop = true,
  typeahead = true,
  label,
  emptyLabel = 'No items',
  linkAs = 'a',
} = defineProps<NuiListProps<T>>();
const model = defineModel<T | T[]>();

const listElement = useTemplateRef<HTMLElement>('list');
const { keyOf, selectedKeys, selectedValues, toggle } = useOptionSelection<T>({
  options: () => [],
  model,
  multiple: () => selectable === 'multiple',
  getKey: () => getKey,
});

const firstEnabled = (entries: readonly NuiListEntry<T>[] | undefined): T | undefined =>
  entries?.find((entry) => entry.value !== undefined && !entry.disabled)?.value;
const tabStopKey = computed(() => {
  const value = selectedValues.value[0] ?? firstEnabled(items);
  return value === undefined ? undefined : keyOf(value);
});
const select = (value: T): void => {
  if (selectable === 'multiple') {
    toggle({ value, label: '' });
  } else {
    model.value = value;
  }
};
provideList<T>({
  selectable: computed(() => selectable),
  size: computed(() => size),
  tabStopKey,
  keyOf,
  isSelected: (value) => selectedKeys.value.has(keyOf(value)),
  select,
});

const itemTitle = (element: HTMLElement): string =>
  element.querySelector('.nui-row__title')?.textContent ?? '';
const firstSelected = (): HTMLElement | null => {
  const found = listElement.value?.querySelector('[role="option"][aria-selected="true"]');
  return found instanceof HTMLElement ? found : null;
};
const navigation = useListNavigation(listElement, {
  selector: '[role="option"]',
  scope: '.nui-list',
  loop: () => loop,
  typeahead: () => typeahead,
  resting: firstSelected,
  itemText: itemTitle,
});

const isOption = (target: EventTarget | null): target is HTMLElement =>
  target instanceof HTMLElement && target.getAttribute('role') === 'option';
const onKeydown = (event: KeyboardEvent): void => {
  if (!selectable) {
    return;
  }
  navigation.onKeydown(event);
  if (event.defaultPrevented || !isOption(event.target)) {
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    event.target.click();
  }
};
const onFocusin = (event: FocusEvent): void => {
  if (selectable) {
    navigation.onFocusin(event);
  }
};
const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;
  if (selectable && !(next instanceof Node && listElement.value?.contains(next))) {
    navigation.reset();
  }
};

onMounted(() => {
  watch(
    () => [selectable, items?.length],
    () => {
      if (selectable) {
        navigation.reset();
      }
    },
    { immediate: true, flush: 'post' },
  );
});
</script>
