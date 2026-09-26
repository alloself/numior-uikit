<template>
  <div
    class="nui-select"
    :class="[
      `nui-select--size-${size}`,
      {
        'nui-select--open': open,
        'nui-select--empty': selectedOptions.length === 0,
        'nui-select--clearable': showClear,
        'nui-select--invalid': isInvalid,
        'nui-select--disabled': isDisabled,
      },
    ]"
    v-bind="split.rootAttrs()"
  >
    <button
      ref="trigger"
      type="button"
      role="combobox"
      class="nui-select__trigger"
      aria-haspopup="listbox"
      :aria-labelledby="field?.labelledBy.value"
      :aria-required="isRequired || undefined"
      v-bind="{ ...controlAttrs, ...split.controlAttrs(), ...control.invokerAttrs.value }"
      @keydown="onTriggerKeydown"
    >
      <span class="nui-select__value">
        <slot name="value" :selected="selectedOptions">{{ displayLabel }}</slot>
      </span>
      <NuiIcon alias="chevron-down" class="nui-select__chevron" />
    </button>
    <NuiButton
      v-if="showClear"
      variant="ghost"
      tone="neutral"
      size="sm"
      class="nui-select__clear"
      :aria-label="clearText"
      @click="clear"
    >
      <NuiIcon alias="x" />
    </NuiButton>
    <NuiList
      :ref="setListbox"
      v-model="model"
      v-model:values="values"
      class="nui-select__listbox"
      variant="floating"
      :items="options"
      :selectable="multiple ? 'multiple' : 'single'"
      :get-key="getKey"
      :keyboard="false"
      :active-id="navigation.activeId.value"
      :empty-label="emptyText"
      v-bind="control.contentAttrs.value"
      @select="onSelect"
      @keydown="onListboxKeydown"
      @pointermove="activateHovered"
      @pointerleave="restActive"
      @focusin="onFocusin"
      @focusout="onFocusout"
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
import {
  createIntent,
  useFieldContext,
  useFieldControl,
  useMessages,
  useSplitAttrs,
} from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiList from '../list/NuiList.vue';
import { optionIndexOf, type NuiOption } from '../shared/options';
import { useListboxSurface } from '../shared/use-listbox-surface';
import { useOptionSelection } from '../shared/use-option-selection';
import { selectMessages } from './select.messages';
import type { NuiSelectProps } from './select.types';

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
  loop = true,
  placement = 'bottom-start',
  emptyLabel,
  clearLabel,
  countLabel,
} = defineProps<NuiSelectProps<T>>();

const model = defineModel<T | null>({ default: null });
const values = defineModel<T[]>('values', { default: () => [] });

const split = useSplitAttrs();
const field = useFieldContext();
const messages = useMessages(selectMessages);

const {
  attrs: controlAttrs,
  invalid: isInvalid,
  required: isRequired,
  disabled: isDisabled,
} = useFieldControl(() => ({ id, disabled, required, invalid }));

const listboxId = computed(() => `${controlAttrs.value.id}-listbox`);

const {
  keyOf,
  flat,
  selectedValues,
  selectedOptions,
  clear: clearSelection,
} = useOptionSelection<T>({
  options: () => options,
  model,
  values,
  multiple: () => multiple,
  getKey: () => getKey,
});

const displayLabel = computed(() => {
  const labels = selectedOptions.value.map((option) => option.label);
  if (labels.length === 0) {
    return placeholder ?? '';
  }
  if (labels.length === 1) {
    return labels[0];
  }
  return countLabel ? countLabel(labels.length) : messages.value.count({ count: labels.length });
});

const emptyText = computed(() => emptyLabel ?? messages.value.empty);
const clearText = computed(() => clearLabel ?? messages.value.clear);

const showClear = computed(() => clearable && selectedValues.value.length > 0 && !isDisabled.value);

const open = ref(false);
const triggerElement = useTemplateRef<HTMLButtonElement>('trigger');

const { listboxElement, setListbox, control, navigation, activateHovered, restActive } =
  useListboxSurface({
    anchor: triggerElement,
    open,
    id: listboxId,
    mode: 'auto',
    placement: () => placement,
    loop: () => loop,
    typeahead: true,
    restOnSelected: true,
  });

const opening = createIntent<OpenFocus>();
let inside = false;

const activate = (): void => {
  navigation.reset();

  switch (opening.take() ?? 'selected') {
    case 'first':
      navigation.setActive(0, { focus: false });
      break;
    case 'last':
      navigation.setActive(navigation.items().length - 1, { focus: false });
      break;
    case 'selected':
      break;
  }
};

watch(open, (isOpen) => {
  if (isOpen) {
    activate();
  } else {
    navigation.reset();
  }
});

const optionOf = (element: HTMLElement | null): NuiOption<T> | undefined =>
  element ? flat.value[optionIndexOf(element)] : undefined;

const onSelect = (): void => {
  if (!multiple) {
    control.hide();
  }
};

const clear = (): void => {
  clearSelection();
  triggerElement.value?.focus({ preventScroll: true });
};

onMounted(() => {
  watch(
    open,
    (isOpen) => {
      if (isOpen) {
        navigation.reveal();
        navigation.activeElement()?.focus({ preventScroll: true });
      } else if (inside) {
        inside = false;
        triggerElement.value?.focus({ preventScroll: true });
      }
    },
    { flush: 'post' },
  );
});

const isPrintable = (event: KeyboardEvent): boolean =>
  event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

type OpenFocus = 'selected' | 'first' | 'last';

const OPENERS: Readonly<Record<string, OpenFocus>> = {
  ArrowDown: 'selected',
  ArrowUp: 'last',
  Home: 'first',
  End: 'last',
};

const pickByTypeahead = (event: KeyboardEvent): void => {
  const element = navigation.matchTypeahead(event.key);
  const match = optionOf(element);
  if (match && !match.disabled) {
    event.preventDefault();
    navigation.setActive(element, { focus: false });
    model.value = match.value;
  }
};

const onTriggerKeydown = (event: KeyboardEvent): void => {
  if (isDisabled.value) {
    return;
  }
  const request = OPENERS[event.key];
  if (request !== undefined) {
    event.preventDefault();
    opening.set(request);
    control.show();
  } else if (event.key === 'Enter' || event.key === ' ') {
    opening.set('selected');
  } else if (!multiple && isPrintable(event)) {
    pickByTypeahead(event);
  }
};

const onListboxKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Tab') {
    control.hide();
    return;
  }
  if (event.key !== 'Enter' && event.key !== ' ') {
    navigation.onKeydown(event);
    return;
  }
  event.preventDefault();
  if (event.key === 'Enter' && multiple) {
    control.hide();
  } else {
    navigation.activeElement()?.click();
  }
};

const onFocusin = (event: FocusEvent): void => {
  inside = true;
  navigation.onFocusin(event);
};

const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;

  const within =
    next instanceof Node &&
    (listboxElement.value?.contains(next) === true ||
      triggerElement.value?.contains(next) === true);

  if (!within) {
    inside = false;
    control.hide();
  }
};
</script>
