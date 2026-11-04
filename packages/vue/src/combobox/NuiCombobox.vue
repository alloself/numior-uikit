<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError">
    <div
      class="nui-combobox"
      :class="[
        `nui-combobox--size-${size}`,
        {
          'nui-combobox--open': open,
          'nui-combobox--multiple': multiple,
          'nui-combobox--invalid': isInvalid,
          'nui-combobox--disabled': isDisabled,
          'nui-combobox--readonly': isReadonly,
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
            size="sm"
            :removable="!isReadonly"
            :remove-tabbable="false"
            :remove-label="`${texts.remove} ${chip.label}`"
            :disabled="isDisabled"
            class="nui-combobox__chip"
            @remove="choose(chip.value)"
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
          variant="plain"
          size="xs"
          class="nui-combobox__clear"
          :aria-label="texts.clear"
          tabindex="-1"
          icon="x"
          @click="clear"
        />
        <NuiButton
          variant="plain"
          size="xs"
          class="nui-combobox__toggle"
          :aria-label="texts.toggle"
          :aria-expanded="open ? 'true' : 'false'"
          :aria-controls="listboxId"
          tabindex="-1"
          :disabled="isDisabled || isReadonly"
          @click="toggle"
        >
          <NuiIcon icon="chevron-down" class="nui-combobox__chevron" />
        </NuiButton>
      </div>
      <NuiList
        :ref="setListbox"
        v-model="model"
        v-model:values="values"
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
          :disabled="isDisabled"
        />
      </template>
    </div>
  </NuiFieldFrame>
</template>

<script setup lang="ts" generic="T">
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
import { createIntent, useFieldControl, useMessages, useSplitAttrs } from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame.vue';
import NuiButton from '../button/NuiButton.vue';
import NuiChip from '../chip/NuiChip.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiList from '../list/NuiList.vue';
import { isComposing } from '../shared/composition';
import { filterOptions, flattenEntries, optionElementId, type NuiOption } from '../shared/options';
import { useListboxSurface } from '../shared/use-listbox-surface';
import { useOptionSelection } from '../shared/use-option-selection';
import { comboboxMessages } from './combobox.messages';
import type { NuiComboboxProps } from './combobox.types';

type Draft = { readonly kind: 'label' } | { readonly kind: 'typed'; readonly text: string };

defineOptions({ inheritAttrs: false });

const {
  id,
  size = 'md',
  disabled = undefined,
  readonly = undefined,
  required = undefined,
  invalid = undefined,
  label,
  description,
  error,
  reserveError = false,
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

const model = defineModel<T | null>({ default: null });
const values = defineModel<T[]>('values', { default: () => [] });
const emit = defineEmits<{ search: [query: string] }>();

const split = useSplitAttrs();
const messages = useMessages(comboboxMessages);

const {
  frame: fieldFrame,
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
  readonly: isReadonly,
} = useFieldControl(
  () => ({ id, disabled, readonly, required, invalid, label, description, error }),
  { commit: () => commitDraft() },
);

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
  choose,
  add,
  clear: clearSelection,
} = useOptionSelection<T>({
  options: () => options,
  model,
  values,
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

const LABEL: Draft = { kind: 'label' };
const draft = shallowRef<Draft>(LABEL);
const typing = computed(() => draft.value.kind === 'typed');

const query = computed(() => (draft.value.kind === 'typed' ? draft.value.text : singleLabel.value));

const lowered = computed(
  () => new Map(flattenEntries(options).map((option) => [option, option.label.toLowerCase()])),
);

const defaultFilter = (option: NuiOption<T>, needle: string): boolean =>
  (lowered.value.get(option) ?? option.label.toLowerCase()).includes(needle);

const isEnabled = (option: NuiOption<T>): boolean => !option.disabled;

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (filter === false || !typing.value || needle === '') {
    return options;
  }
  return filterOptions(options, (option) => (filter ?? defaultFilter)(option, needle));
});

const showClear = computed(
  () => clearable && selectedValues.value.length > 0 && !isDisabled.value && !isReadonly.value,
);

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

const opening = createIntent<'first' | 'last'>();
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
  const position = opening.take() ?? 'first';

  if (isOpen) {
    activate(position);
  } else {
    navigation.setActive(null, { focus: false });
  }
});

watch(filtered, () => {
  if (open.value) {
    activate('first');
  }
});

const focusInput = (): void => inputElement.value?.focus({ preventScroll: true });

const settleQuery = (): void => {
  draft.value = LABEL;
};

const onSelect = (): void => {
  draft.value = LABEL;

  if (!multiple) {
    open.value = false;
  }
  focusInput();
};

const commitDraft = (): void => {
  if (typing.value && !commitCustom()) {
    settleQuery();
  }
};

const commitCustom = (): boolean => {
  const text = query.value.trim();
  if (!customValue || text === '') {
    return false;
  }
  draft.value = LABEL;
  open.value = false;
  add(customValue(text));
  return true;
};

const clear = (): void => {
  clearSelection();
  draft.value = LABEL;
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

  draft.value = { kind: 'typed', text };
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
    opening.set(event.key === 'ArrowUp' ? 'last' : 'first');
    open.value = true;
  }
  return true;
};

const onEnter = (event: KeyboardEvent): void => {
  const active = open.value ? navigation.activeElement() : null;

  if (active) {
    event.preventDefault();
    active.click();
    return;
  }

  if (commitCustom()) {
    event.preventDefault();
    return;
  }

  if (open.value) {
    event.preventDefault();
    open.value = false;
    return;
  }

  if (typing.value) {
    settleQuery();
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
    choose(last.value);
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
  if (isComposing(event) || isReadonly.value) {
    return;
  }

  if (!openFromKey(event)) {
    KEY_HANDLERS[event.key]?.(event);
  }
};

const onFieldClick = (event: MouseEvent): void => {
  const onButton = event.target instanceof Element && event.target.closest('button') !== null;
  if (isDisabled.value || isReadonly.value || onButton) {
    return;
  }
  focusInput();
  if (!open.value) {
    opening.set('first');
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
  commitDraft();
};

defineExpose({ focus: focusInput });
</script>
