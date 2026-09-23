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
    <div ref="field" class="nui-combobox__field">
      <template v-if="multiple">
        <span v-for="chip in chips" :key="chip.key" class="nui-combobox__chip">
          <span class="nui-combobox__chip-label">{{ chip.label }}</span>
          <NuiButton
            variant="ghost"
            tone="neutral"
            size="sm"
            class="nui-combobox__chip-remove"
            :aria-label="`${removeLabel} ${chip.label}`"
            tabindex="-1"
            :disabled="isDisabled"
            @click="toggleSelection(chip)"
          >
            <NuiIcon alias="x" />
          </NuiButton>
        </span>
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
        :aria-label="clearLabel"
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
        :aria-label="toggleLabel"
        :aria-expanded="open ? 'true' : 'false'"
        :aria-controls="listboxId"
        tabindex="-1"
        :disabled="isDisabled"
        @click="toggle"
      >
        <NuiIcon alias="chevron-down" class="nui-combobox__chevron" />
      </NuiButton>
    </div>
    <NuiListbox
      :ref="setListbox"
      class="nui-combobox__listbox nui-listbox--floating"
      :style="floatingStyles"
      :options="filtered"
      :selected-keys="selectedKeys"
      :key-of="keyOf"
      :active-id="navigation.activeId.value"
      :multiple="multiple"
      :loading="loading"
      :empty-label="emptyLabel"
      :loading-label="loadingLabel"
      v-bind="control.contentAttrs.value"
      @select="choose"
      @pointermove="onPointermove"
      @pointerdown.prevent
    >
      <template #option="slot"><slot name="option" v-bind="slot" /></template>
    </NuiListbox>
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
import {
  useFieldControl,
  useFloating,
  useListNavigation,
  usePopover,
  useSplitAttrs,
} from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiListbox from '../listbox/NuiListbox.vue';
import { optionIndexOf } from '../listbox/listbox.types';
import { filterOptions, flattenOptions, type NuiOption } from '../shared/options';
import { useOptionSelection } from '../shared/use-option-selection';
import { useTriggerElement } from '../shared/trigger-ref';
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
  emptyLabel = 'No matches',
  loadingLabel = 'Loading',
  clearLabel = 'Clear',
  removeLabel = 'Remove',
  toggleLabel = 'Show options',
} = defineProps<NuiComboboxProps<T>>();
const model = defineModel<T | T[]>();
const emit = defineEmits<{ search: [query: string] }>();

const split = useSplitAttrs();
const {
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
} = useFieldControl(() => ({ id, disabled, required, invalid }));
const listboxId = computed(() => `${controlAttrs.value.id}-listbox`);
const {
  keyOf,
  flat,
  selectedValues,
  selectedKeys,
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
const { trigger: listboxElement, setTrigger: setListbox } = useTriggerElement();
const control = usePopover(listboxElement, { open, id: listboxId, mode: 'manual' });
const { floatingStyles } = useFloating(fieldElement, listboxElement, {
  placement: () => placement,
  offset: 4,
  size: { matchWidth: true, fitHeight: true },
  enabled: open,
});
const navigation = useListNavigation(listboxElement, {
  selector: '[role="option"]',
  mode: 'virtual',
  typeahead: false,
  loop: true,
});
const state = { pending: 'first' };

const focusInput = (): void => inputElement.value?.focus({ preventScroll: true });
const optionOf = (element: HTMLElement | null): NuiOption<T> | undefined =>
  element ? flat.value.find((option) => keyOf(option.value) === keyOfElement(element)) : undefined;
const keyOfElement = (element: HTMLElement): string | undefined => {
  const visible = flattenOptions(filtered.value)[optionIndexOf(element)];
  return visible ? keyOf(visible.value) : undefined;
};
const settleQuery = (): void => {
  filtering.value = false;
  query.value = singleLabel.value;
};
const choose = (option: NuiOption<T>): void => {
  if (option.disabled) {
    return;
  }
  if (multiple) {
    toggleSelection(option);
    filtering.value = false;
    query.value = '';
  } else {
    model.value = option.value;
    filtering.value = false;
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
    open,
    (isOpen) => {
      navigation.reset();
      if (isOpen && state.pending === 'last') {
        navigation.focusLast();
      }
      state.pending = 'first';
    },
    { flush: 'post' },
  );
  watch(filtered, () => navigation.reset(), { flush: 'post' });
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
  const active = open.value ? optionOf(navigation.activeElement()) : undefined;
  if (active) {
    event.preventDefault();
    choose(active);
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
const onPointermove = (event: PointerEvent): void => {
  const option =
    event.target instanceof HTMLElement ? event.target.closest('[role="option"]') : null;
  if (option instanceof HTMLElement && option !== navigation.activeElement()) {
    navigation.setActive(option);
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
