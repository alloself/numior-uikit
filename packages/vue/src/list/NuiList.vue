<template>
  <div
    :id="listId"
    ref="root"
    class="nui-list"
    :class="[
      `nui-list--variant-${variant}`,
      `nui-list--size-${size}`,
      { 'nui-list--selectable': selectable !== undefined, 'nui-list--empty': isEmpty },
    ]"
    v-bind="rootAria"
    @keydown="onKeydown"
    @focusin="onFocusin"
    @focusout="onFocusout"
  >
    <component :is="as" class="nui-list__items" v-bind="itemsAria">
      <template v-for="(group, position) in groups" :key="position">
        <li
          v-if="group.label !== undefined"
          class="nui-list__group"
          :role="selectable ? 'group' : undefined"
          :aria-labelledby="`${listId}-group-${position}`"
        >
          <div :id="`${listId}-group-${position}`" class="nui-list__group-label">
            {{ group.label }}
          </div>
          <ul class="nui-list__group-items" :role="selectable ? 'presentation' : undefined">
            <NuiListEntries
              :entries="group.items"
              :list-id="listId"
              :link-as="linkAs"
              :index-of="indexOf"
            >
              <template #item="slot"><slot name="item" v-bind="slot" /></template>
            </NuiListEntries>
          </ul>
        </li>
        <NuiListEntries
          v-else
          :entries="group.items"
          :list-id="listId"
          :link-as="linkAs"
          :index-of="indexOf"
        >
          <template #item="slot"><slot name="item" v-bind="slot" /></template>
        </NuiListEntries>
      </template>
      <slot />
      <li v-if="loading" class="nui-list__status" :role="selectable ? 'presentation' : undefined">
        <NuiIcon alias="loader" class="nui-list__spinner" />
        {{ loadingText }}
      </li>
      <li
        v-else-if="isEmpty"
        class="nui-list__empty"
        :role="selectable ? 'presentation' : undefined"
      >
        <slot name="empty">
          <NuiEmpty size="sm" :hide-icon="variant === 'floating'" :title="emptyText" />
        </slot>
      </li>
    </component>
  </div>
</template>

<script setup lang="ts" generic="T, E extends NuiListEntry<T> = NuiListEntry<T>">
import { computed, onMounted, useTemplateRef } from 'vue';
import { useControlId, useListNavigation, useMessages } from '@numior/primitives';
import NuiEmpty from '../empty/NuiEmpty.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { flattenEntries, groupEntries, type NuiListEntry } from '../shared/options';
import { useOptionSelection } from '../shared/use-option-selection';
import NuiListEntries from './NuiListEntries.vue';
import { provideList } from './list-context';
import { listMessages } from './list.messages';
import type { NuiListProps } from './list.types';

const {
  id,
  as = 'ul',
  variant = 'plain',
  size = 'md',
  items,
  selectable,
  getKey,
  loop = true,
  typeahead = true,
  keyboard = true,
  activeId,
  loading = false,
  loadingLabel,
  label,
  labelledBy,
  emptyLabel,
  linkAs = 'a',
} = defineProps<NuiListProps<T, E>>();

const model = defineModel<T | null>({ default: null });
const values = defineModel<T[]>('values', { default: () => [] });
const emit = defineEmits<{ select: [item: E] }>();

const listId = useControlId(() => id);
const messages = useMessages(listMessages);

const loadingText = computed(() => loadingLabel ?? messages.value.loading);
const emptyText = computed(() => emptyLabel ?? messages.value.empty);
const naming = computed(() => ({ 'aria-label': label, 'aria-labelledby': labelledBy }));

const rootAria = computed(() =>
  selectable
    ? {
        role: 'listbox',
        'aria-multiselectable': selectable === 'multiple' || undefined,
        'aria-busy': loading || undefined,
        ...naming.value,
      }
    : { 'aria-busy': loading || undefined },
);

const itemsAria = computed(() => (selectable ? { role: 'presentation' } : naming.value));
const rootElement = useTemplateRef<HTMLElement>('root');
const flat = computed<E[]>(() => (items ? flattenEntries(items) : []));
const groups = computed(() => (items ? groupEntries(items) : []));
const indices = computed(() => new Map(flat.value.map((entry, index) => [entry, index])));
const indexOf = (entry: E): number => indices.value.get(entry) ?? -1;
const isEmpty = computed(() => items !== undefined && flat.value.length === 0);

const { keyOf, selectedKeys, selectedValues, choose } = useOptionSelection<T>({
  options: () => [],
  model,
  values,
  multiple: () => selectable === 'multiple',
  getKey: () => getKey,
});

const firstEnabled = (): T | undefined =>
  flat.value.find((entry) => entry.value !== undefined && !entry.disabled)?.value;

const tabStopKey = computed(() => {
  const value = selectedValues.value[0] ?? firstEnabled();
  return value === undefined ? undefined : keyOf(value);
});

const entryOf = (value: T): E | undefined =>
  flat.value.find((entry) => entry.value !== undefined && keyOf(entry.value) === keyOf(value));

const select = (value: T): void => {
  choose(value);

  const entry = entryOf(value);
  if (entry) {
    emit('select', entry);
  }
};

provideList<T>({
  selectable: computed(() => selectable),
  variant: computed(() => variant),
  size: computed(() => size),
  tabStopKey,
  activeId: computed(() => activeId),
  keyOf,
  isSelected: (value) => selectedKeys.value.has(keyOf(value)),
  select,
});

const itemTitle = (element: HTMLElement): string =>
  element.querySelector('.nui-row__title')?.textContent ?? '';

const firstSelected = (): HTMLElement | null => {
  const found = rootElement.value?.querySelector('[role="option"][aria-selected="true"]');
  return found instanceof HTMLElement ? found : null;
};

const navigation = useListNavigation(rootElement, {
  selector: '[role="option"]',
  scope: '.nui-list',
  loop: () => loop,
  typeahead: () => typeahead,
  resting: firstSelected,
  itemText: itemTitle,
});

const owns = (): boolean => keyboard && selectable !== undefined;

const isOption = (target: EventTarget | null): target is HTMLElement =>
  target instanceof HTMLElement && target.getAttribute('role') === 'option';

const onKeydown = (event: KeyboardEvent): void => {
  if (!owns()) {
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
  if (owns()) {
    navigation.onFocusin(event);
  }
};

const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;
  if (owns() && !(next instanceof Node && rootElement.value?.contains(next))) {
    navigation.reset();
  }
};

onMounted(() => {
  if (owns()) {
    navigation.reset();
  }
});
</script>
