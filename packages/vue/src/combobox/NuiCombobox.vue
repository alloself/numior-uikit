<template>
  <div
    class="nui-combobox"
    :class="[
      `nui-combobox--size-${size}`,
      {
        'nui-combobox--open': open,
        'nui-combobox--multiple': multiple,
        'nui-combobox--invalid': isInvalid,
        'nui-combobox--disabled': isDisabled,
      },
    ]"
    v-bind="split.rootAttrs()"
    @focusout="onFocusout"
  >
    <div ref="field" class="nui-combobox__field" @click="onFieldClick">
      <template v-if="multiple">
        <NuiChip
          v-for="chip in chips"
          :key="chip.key"
          removable
          :remove-label="`${texts.remove} ${chip.label}`"
          :disabled="isDisabled"
          class="nui-combobox__chip"
          @remove="toggleSelection(chip)"
        >
          {{ chip.label }}
        </NuiChip>
      </template>
      <input
        ref="input"
        class="nui-combobox__input"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="open ? 'true' : 'false'"
        :aria-controls="listboxId"
        :aria-activedescendant="open ? navigation.activeId.value : undefined"
        :placeholder="selectedValues.length === 0 ? placeholder : undefined"
        :value="query"
        v-bind="{ ...controlAttrs, ...split.controlAttrs() }"
        @input="onInput"
        @keydown="onKeydown"
      />
      <NuiButton
        v-if="showClear"
        variant="ghost"
        tone="neutral"
        size="sm"
        class="nui-combobox__clear"
        :aria-label="texts.clear"
        tabindex="-1"
        @click="clear"
      >
        <NuiIcon alias="x" />
      </NuiButton>
      <NuiButton
        variant="ghost"
        tone="neutral"
        size="sm"
        class="nui-combobox__toggle"
        :aria-label="texts.toggle"
        :aria-expanded="open ? 'true' : 'false'"
        :aria-controls="listboxId"
        tabindex="-1"
        :disabled="isDisabled"
        @click="toggle"
      >
        <NuiIcon alias="chevron-down" class="nui-combobox__chevron" />
      </NuiButton>
    </div>
    <NuiList
      :ref="setListbox"
      v-model="model"
      class="nui-combobox__listbox"
      variant="floating"
      :items="filtered"
      :selectable="multiple ? 'multiple' : 'single'"
      :get-key="getKey"
      :keyboard="false"
      :active-id="navigation.activeId.value"
      :loading="loading"
      :loading-label="loadingLabel"
      :empty-label="texts.empty"
      v-bind="control.contentAttrs.value"
      @select="onSelect"
      @pointermove="activateHovered"
      @pointerleave="restActive"
      @pointerdown.prevent
    >
      <template #item="slot">
        <slot name="option" :option="slot.item" :selected="slot.selected" :active="slot.active" />
      </template>
    </NuiList>
    <template v-if="name">
      <input
        v-for="value in selectedValues"
        :key="keyOf(value)"
        type="hidden"
        :name="name"
        :value="keyOf(value)"
      />
    </template>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useFieldControl, useMessages, useSplitAttrs } from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiChip from '../chip/NuiChip.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiList from '../list/NuiList.vue';
import { filterOptions, flattenEntries, optionElementId, type NuiOption } from '../shared/options';
import { useListboxSurface } from '../shared/use-listbox-surface';
import { useOptionSelection } from '../shared/use-option-selection';
import { comboboxMessages } from './combobox.messages';
import type { NuiComboboxProps } from './combobox.types';

defineOptions({ inheritAttrs: false });

const {
  id,
  size = 'md',
  disabled = undefined,
  required = undefined,
  invalid = undefined,
  options,
  multiple = false,
  clearable = false,
  placeholder,
  name,
  getKey,
  filter = undefined,
  loading = false,
  customValue,
  placement = 'bottom-start',
  emptyLabel,
  loadingLabel,
  clearLabel,
  removeLabel,
  toggleLabel,
} = defineProps<NuiComboboxProps<T>>();

const model = defineModel<T | T[]>();
const emit = defineEmits<{ search: [query: string] }>();

const split = useSplitAttrs();
const messages = useMessages(comboboxMessages);

const {
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
} = useFieldControl(() => ({ id, disabled, required, invalid }));

const listboxId = computed(() => `${controlAttrs.value.id}-listbox`);

const texts = computed(() => ({
  empty: emptyLabel ?? messages.value.empty,
  clear: clearLabel ?? messages.value.clear,
  remove: removeLabel ?? messages.value.remove,
  toggle: toggleLabel ?? messages.value.toggle,
}));

const {
  keyOf,
  selectedValues,
  optionOf: optionForValue,
  toggle: toggleSelection,
  clear: clearSelection,
} = useOptionSelection<T>({
  options: () => options,
  model,
  multiple: () => multiple,
  getKey: () => getKey,
});

const labelFor = (value: T): string => optionForValue(value)?.label ?? keyOf(value);

const chips = computed(() =>
  selectedValues.value.map((value) => ({ key: keyOf(value), value, label: labelFor(value) })),
);

const singleLabel = computed(() => {
  const [first] = selectedValues.value;
  return multiple || first === undefined ? '' : labelFor(first);
});

const query = ref('');
const filtering = ref(false);

watch(
  singleLabel,
  (label) => {
    if (!filtering.value) {
      query.value = label;
    }
  },
  { immediate: true },
);

const defaultFilter = (option: NuiOption<T>, needle: string): boolean =>
  option.label.toLowerCase().includes(needle);

const isEnabled = (option: NuiOption<T>): boolean => !option.disabled;

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (filter === false || !filtering.value || needle === '') {
    return options;
  }
  return filterOptions(options, (option) => (filter ?? defaultFilter)(option, needle));
});

const showClear = computed(() => clearable && selectedValues.value.length > 0 && !isDisabled.value);

const open = ref(false);
const fieldElement = useTemplateRef<HTMLElement>('field');
const inputElement = useTemplateRef<HTMLInputElement>('input');

const { listboxElement, setListbox, control, navigation, activateHovered, restActive } =
  useListboxSurface({
    anchor: fieldElement,
    open,
    id: listboxId,
    mode: 'manual',
    placement: () => placement,
    focus: 'virtual',
    loop: true,
    typeahead: false,
    restOnSelected: false,
  });

const state = { pending: 'first' };
const filteredFlat = computed(() => flattenEntries(filtered.value));

const activate = (position: 'first' | 'last'): void => {
  const entries = filteredFlat.value;

  const index =
    position === 'first' ? entries.findIndex(isEnabled) : entries.findLastIndex(isEnabled);

  navigation.setActive(index < 0 ? null : optionElementId(listboxId.value, index), {
    focus: false,
  });
};

watch(open, (isOpen) => {
  if (isOpen) {
    activate(state.pending === 'last' ? 'last' : 'first');
  } else {
    navigation.setActive(null, { focus: false });
  }

  state.pending = 'first';
});

watch(filtered, () => {
  if (open.value) {
    activate('first');
  }
});

const focusInput = (): void => inputElement.value?.focus({ preventScroll: true });

const settleQuery = (): void => {
  filtering.value = false;
  query.value = singleLabel.value;
};

const onSelect = (option: NuiOption<T>): void => {
  filtering.value = false;
  if (multiple) {
    query.value = '';
  } else {
    query.value = option.label;
    open.value = false;
  }
  focusInput();
};

const commitCustom = (): boolean => {
  const text = query.value.trim();
  if (!customValue || text === '') {
    return false;
  }
  const value = customValue(text);
  if (multiple) {
    model.value = [...selectedValues.value, value];
    query.value = '';
  } else {
    model.value = value;
  }
  filtering.value = false;
  open.value = false;
  return true;
};

const clear = (): void => {
  clearSelection();
  filtering.value = false;
  query.value = '';
  focusInput();
};

const toggle = (): void => {
  open.value = !open.value;
  focusInput();
};

onMounted(() => {
  watch(
    [open, filtered],
    () => {
      if (open.value) {
        navigation.reveal();
      }
    },
    { flush: 'post' },
  );
});

const onInput = (): void => {
  const text = inputElement.value?.value ?? '';
  query.value = text;
  filtering.value = true;
  open.value = true;
  emit('search', text);
};

const openFromKey = (event: KeyboardEvent): boolean => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
    return false;
  }
  if (open.value) {
    navigation.onKeydown(event);
  } else {
    event.preventDefault();
    state.pending = event.key === 'ArrowUp' ? 'last' : 'first';
    open.value = true;
  }
  return true;
};

const onEnter = (event: KeyboardEvent): void => {
  const active = open.value ? navigation.activeElement() : null;
  if (active) {
    event.preventDefault();
    active.click();
  } else if (commitCustom()) {
    event.preventDefault();
  }
};

const onEscape = (event: KeyboardEvent): void => {
  if (open.value) {
    event.preventDefault();
    open.value = false;
  }
};

const onBackspace = (): void => {
  const last = chips.value.at(-1);
  if (multiple && query.value === '' && last) {
    toggleSelection(last);
  }
};

const KEY_HANDLERS: Record<string, (event: KeyboardEvent) => void> = {
  Enter: onEnter,
  Escape: onEscape,
  Tab: () => {
    open.value = false;
  },
  Backspace: onBackspace,
};

const onKeydown = (event: KeyboardEvent): void => {
  if (!openFromKey(event)) {
    KEY_HANDLERS[event.key]?.(event);
  }
};

const onFieldClick = (event: MouseEvent): void => {
  const onButton = event.target instanceof Element && event.target.closest('button') !== null;
  if (isDisabled.value || onButton) {
    return;
  }
  focusInput();
  if (!open.value) {
    state.pending = 'first';
    open.value = true;
  }
};

const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;

  const within =
    next instanceof Node &&
    (fieldElement.value?.contains(next) === true || listboxElement.value?.contains(next) === true);

  if (within) {
    return;
  }
  open.value = false;
  if (filtering.value && !commitCustom()) {
    settleQuery();
  }
};

defineExpose({ focus: focusInput });
</script>
