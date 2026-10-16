<template>
  <div
    class="nui-command nui-layer"
    :class="{ 'nui-command--loading': loading }"
    @focusout="onFocusout"
  >
    <div class="nui-command__field">
      <NuiIcon alias="search" class="nui-command__icon" />
      <input
        ref="input"
        :id="inputId"
        class="nui-command__input"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-autocomplete="list"
        aria-expanded="true"
        :aria-controls="listId"
        :aria-activedescendant="navigation.activeId.value"
        :aria-label="texts.label"
        :placeholder="texts.placeholder"
        :value="query"
        @input="onInput"
        @keydown="onKeydown"
      />
      <slot name="end" />
    </div>
    <NuiList
      :id="listId"
      :ref="setListbox"
      v-model="picked"
      class="nui-command__list"
      :items="filtered"
      selectable="single"
      :get-key="getKey"
      :keyboard="false"
      :active-id="navigation.activeId.value"
      :loading="loading"
      :loading-label="loadingLabel"
      :empty-label="texts.empty"
      :label="texts.label"
      @select="onSelect"
      @pointermove="activateHovered"
      @pointerdown.prevent
    >
      <template v-if="$slots.item" #item="slot">
        <slot name="item" :item="slot.item" :active="slot.active" />
      </template>
    </NuiList>
    <div v-if="$slots.footer" class="nui-command__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue';
import { useControlId, useListNavigation, useMessages } from '@numior/primitives';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiList from '../list/NuiList.vue';
import { isComposing } from '../shared/composition';
import { filterOptions, flattenEntries, optionElementId } from '../shared/options';
import { useTriggerElement } from '../shared/trigger-ref';
import { defaultCommandFilter } from './command-filter';
import { commandMessages } from './command.messages';
import type { NuiCommandItem, NuiCommandItemSlot, NuiCommandProps } from './command.types';

const {
  id,
  items,
  filter = undefined,
  loading = false,
  loop = true,
  autofocus = false,
  getKey,
  label,
  placeholder,
  emptyLabel,
  loadingLabel,
} = defineProps<NuiCommandProps<T>>();

const query = defineModel<string>('query', { default: '' });
const emit = defineEmits<{ select: [item: NuiCommandItem<T>]; search: [query: string] }>();

defineSlots<{
  item?(props: NuiCommandItemSlot<T>): unknown;
  end?(): unknown;
  footer?(): unknown;
}>();

const messages = useMessages(commandMessages);
const inputId = useControlId(() => id);
const listId = computed(() => `${inputId.value}-list`);
const input = useTemplateRef<HTMLInputElement>('input');
const { trigger: listElement, setTrigger: setListbox } = useTriggerElement();
const picked = shallowRef<T | null>(null);

const texts = computed(() => ({
  label: label ?? messages.value.label,
  placeholder: placeholder ?? messages.value.placeholder,
  empty: emptyLabel ?? messages.value.empty,
}));

const filtered = computed(() => {
  if (filter === false) {
    return items;
  }
  const keep = filter ?? defaultCommandFilter;

  return filterOptions(items, (item) => keep(item, query.value));
});

const navigation = useListNavigation(listElement, {
  selector: '[role="option"]',
  scope: '.nui-list',
  mode: 'virtual',
  loop: () => loop,
  typeahead: false,
});

const activateFirst = (): void => {
  const first = flattenEntries(filtered.value).findIndex((item) => !item.disabled);

  navigation.setActive(first < 0 ? null : optionElementId(listId.value, first), { focus: false });
};

const onInput = (event: Event): void => {
  if (event.target instanceof HTMLInputElement) {
    query.value = event.target.value;
    emit('search', event.target.value);
    activateFirst();
  }
};

const onKeydown = (event: KeyboardEvent): void => {
  if (isComposing(event)) {
    return;
  }
  navigation.onKeydown(event);

  if (event.key === 'Enter' && !event.defaultPrevented) {
    event.preventDefault();
    navigation.activeElement()?.click();
  }
};

const activateHovered = (event: PointerEvent): void => {
  const option =
    event.target instanceof HTMLElement ? event.target.closest('[role="option"]') : null;

  if (option instanceof HTMLElement && option !== navigation.activeElement()) {
    navigation.setActive(option, { focus: false });
  }
};

const onSelect = (item: NuiCommandItem<T>): void => {
  picked.value = null;
  emit('select', item);
};

const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;

  if (!(next instanceof HTMLInputElement && next === input.value)) {
    navigation.reveal();
  }
};

watch(
  () => items,
  () => activateFirst(),
  { flush: 'pre' },
);

watch(
  () => navigation.activeId.value,
  () => navigation.reveal(),
  { flush: 'post' },
);

onMounted(() => {
  activateFirst();

  if (autofocus) {
    input.value?.focus();
  }
});

defineExpose({ focus: () => input.value?.focus() });
</script>
