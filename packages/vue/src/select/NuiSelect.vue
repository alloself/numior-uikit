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
      :aria-label="clearLabel"
      @click="clear"
    >
      <NuiIcon alias="x" />
    </NuiButton>
    <NuiListbox
      :ref="setListbox"
      class="nui-select__listbox nui-listbox--floating"
      :style="floatingStyles"
      :options="options"
      :selected-keys="selectedKeys"
      :key-of="keyOf"
      :multiple="multiple"
      :empty-label="emptyLabel"
      v-bind="control.contentAttrs.value"
      @select="choose"
      @keydown="onListboxKeydown"
      @pointermove="onPointermove"
      @focusin="onFocusin"
      @focusout="onFocusout"
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
  useField,
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
import type { NuiOption } from '../shared/options';
import { useOptionSelection } from '../shared/use-option-selection';
import { useTriggerElement } from '../shared/trigger-ref';
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
  emptyLabel = 'No options',
  clearLabel = 'Clear',
  countLabel,
} = defineProps<NuiSelectProps<T>>();
const model = defineModel<T | T[]>();

const split = useSplitAttrs();
const field = useField();
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
  selectedKeys,
  selectedOptions,
  toggle,
  clear: clearSelection,
} = useOptionSelection<T>({
  options: () => options,
  model,
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
  return countLabel ? countLabel(labels.length) : `${labels.length} selected`;
});
const showClear = computed(() => clearable && selectedValues.value.length > 0 && !isDisabled.value);

const open = ref(false);
const triggerElement = useTemplateRef<HTMLButtonElement>('trigger');
const { trigger: listboxElement, setTrigger: setListbox } = useTriggerElement();
const control = usePopover(listboxElement, { open, id: listboxId, mode: 'auto' });
const { floatingStyles } = useFloating(triggerElement, listboxElement, {
  placement: () => placement,
  offset: 4,
  size: { matchWidth: true, fitHeight: true },
  enabled: open,
});
const selectedElement = (): HTMLElement | null => {
  const found = listboxElement.value?.querySelector('[role="option"][aria-selected="true"]');
  return found instanceof HTMLElement ? found : null;
};
const navigation = useListNavigation(listboxElement, {
  selector: '[role="option"]',
  loop: () => loop,
  typeahead: true,
  resting: selectedElement,
});
const state = { pending: 'selected', inside: false };

const optionOf = (element: HTMLElement | null): NuiOption<T> | undefined =>
  element ? flat.value[optionIndexOf(element)] : undefined;
const commit = (option: NuiOption<T>): void => {
  if (multiple) {
    toggle(option);
  } else {
    model.value = option.value;
  }
};
const choose = (option: NuiOption<T>): void => {
  if (option.disabled) {
    return;
  }
  commit(option);
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
      navigation.reset();
      if (isOpen) {
        if (state.pending === 'last') {
          navigation.focusLast();
        } else if (state.pending === 'first') {
          navigation.focusFirst();
        } else {
          navigation.setActive(navigation.activeElement());
        }
        state.pending = 'selected';
      } else if (state.inside) {
        state.inside = false;
        triggerElement.value?.focus({ preventScroll: true });
      }
    },
    { flush: 'post' },
  );
});

const isPrintable = (event: KeyboardEvent): boolean =>
  event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
const OPENERS: Record<string, string> = {
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
    commit(match);
  }
};
const onTriggerKeydown = (event: KeyboardEvent): void => {
  if (isDisabled.value) {
    return;
  }
  const request = OPENERS[event.key];
  if (request !== undefined) {
    event.preventDefault();
    state.pending = request;
    control.show();
  } else if (event.key === 'Enter' || event.key === ' ') {
    state.pending = 'selected';
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
  const active = optionOf(navigation.activeElement());
  if (event.key === 'Enter' && multiple) {
    control.hide();
  } else if (active) {
    choose(active);
  }
};
const onPointermove = (event: PointerEvent): void => {
  const option =
    event.target instanceof HTMLElement ? event.target.closest('[role="option"]') : null;
  if (option instanceof HTMLElement && option !== navigation.activeElement()) {
    navigation.setActive(option);
  }
};
const onFocusin = (event: FocusEvent): void => {
  state.inside = true;
  navigation.onFocusin(event);
};
const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;
  const within =
    next instanceof Node &&
    (listboxElement.value?.contains(next) === true ||
      triggerElement.value?.contains(next) === true);
  if (!within) {
    state.inside = false;
    control.hide();
  }
};
</script>
