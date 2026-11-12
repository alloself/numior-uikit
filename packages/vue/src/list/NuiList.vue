<template>
  <div
    :id="listId"
    ref="root"
    class="nui-list"
    :class="[
      `nui-list--variant-${variant}`,
      `nui-list--size-${size}`,
      {
        'nui-list--selectable': selectable !== undefined,
        'nui-list--empty': isEmpty,
        'nui-layer': variant === NuiListVariant.Floating,
      },
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
              :leading="$slots.leading !== undefined"
            >
              <template #item="slot"><slot name="item" v-bind="slot" /></template>
              <template #leading="slot"><slot name="leading" v-bind="slot" /></template>
            </NuiListEntries>
          </ul>
        </li>
        <NuiListEntries
          v-else
          :entries="group.items"
          :list-id="listId"
          :link-as="linkAs"
          :index-of="indexOf"
          :leading="$slots.leading !== undefined"
        >
          <template #item="slot"><slot name="item" v-bind="slot" /></template>
          <template #leading="slot"><slot name="leading" v-bind="slot" /></template>
        </NuiListEntries>
      </template>
      <slot />
      <li v-if="loading" class="nui-list__status" :role="selectable ? 'presentation' : undefined">
        <NuiIcon icon="loader" class="nui-list__spinner" />
        {{ loadingText }}
      </li>
      <li
        v-else-if="isEmpty"
        class="nui-list__empty"
        :role="selectable ? 'presentation' : undefined"
      >
        <slot name="empty">
          <NuiEmpty size="sm" :hide-icon="variant === NuiListVariant.Floating" :title="emptyText" />
        </slot>
      </li>
    </component>
  </div>
</template>

<script setup lang="ts" generic="T, E extends NuiListEntry<T> = NuiListEntry<T>">
import { computed, onMounted, useTemplateRef } from 'vue';
import { Key, useControlId, useListNavigation, useMessages } from '@numior/primitives';
import NuiEmpty from '../empty/NuiEmpty.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { flattenEntries, groupEntries, type NuiListEntry } from '../shared/options';
import { useOptionSelection } from '../shared/use-option-selection';
import NuiListEntries from './NuiListEntries.vue';
import { provideList, provideListItems, useListItems } from './list-context';
import { createListItems, titleOf } from './list-items';
import { listMessages } from './list.messages';
import {
  ListContextKind,
  NuiListSelectable,
  NuiListTag,
  NuiListVariant,
  type NuiListProps,
} from './list.types';
import { NuiSize } from '../shared/scale.types';

const {
  id,
  as = NuiListTag.Ul,
  variant = NuiListVariant.Plain,
  size = NuiSize.Md,
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
  linkAs,
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
        'aria-multiselectable': selectable === NuiListSelectable.Multiple || undefined,
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
  multiple: () => selectable === NuiListSelectable.Multiple,
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
  if (!entry) {
    return;
  }

  emit('select', entry);
};

const listItems = useListItems() ?? createListItems();

provideListItems(null);

provideList<T>({
  kind: ListContextKind.List,
  items: listItems,
  selectable: computed(() => selectable),
  variant: computed(() => variant),
  size: computed(() => size),
  tabStopKey,
  activeId: computed(() => activeId),
  keyOf,
  isSelected: (value) => selectedKeys.value.has(keyOf(value)),
  select,
});

const navigation = useListNavigation(rootElement, {
  items: listItems.elements.elements,
  loop: () => loop,
  typeahead: () => typeahead,
  resting: () =>
    listItems.elements.first((key) => typeof key === 'string' && selectedKeys.value.has(key)),
  itemText: (element) => titleOf(listItems, element),
});

const owns = (): boolean => keyboard && selectable !== undefined;

const isOption = (target: EventTarget | null): target is HTMLElement =>
  target instanceof HTMLElement && navigation.has(target);

const onKeydown = (event: KeyboardEvent): void => {
  if (!owns()) {
    return;
  }
  navigation.onKeydown(event);
  if (event.defaultPrevented || !isOption(event.target)) {
    return;
  }
  if (event.key !== Key.Enter && event.key !== Key.Space) {
    return;
  }

  event.preventDefault();
  event.target.click();
};

const onFocusin = (event: FocusEvent): void => {
  if (!owns()) {
    return;
  }

  navigation.onFocusin(event);
};

const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;
  if (!owns() || (next instanceof Node && rootElement.value?.contains(next))) {
    return;
  }

  navigation.reset();
};

onMounted(() => {
  if (!owns()) {
    return;
  }

  navigation.reset();
});
</script>
