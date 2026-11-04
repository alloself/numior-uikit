<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError">
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
          'nui-select--readonly': isReadonly,
        },
      ]"
      v-bind="split.rootAttrs()"
    >
      <button
        ref="trigger"
        type="button"
        role="combobox"
        class="nui-select__trigger"
        :aria-haspopup="isTree ? 'tree' : 'listbox'"
        :aria-labelledby="field?.labelledBy.value"
        :aria-required="isRequired || undefined"
        v-bind="{
          ...controlAttrs,
          ...split.controlAttrs(),
          ...control.invokerAttrs.value,
          ...readonlyInvoker,
        }"
        @keydown="onTriggerKeydown"
      >
        <span class="nui-select__value">
          <slot name="value" :selected="selectedOptions">{{ displayLabel }}</slot>
        </span>
      </button>
      <NuiButton
        v-if="!isReadonly"
        variant="plain"
        size="xs"
        class="nui-select__toggle"
        :aria-label="toggleText"
        :aria-expanded="open ? 'true' : 'false'"
        :aria-controls="listboxId"
        tabindex="-1"
        :disabled="isDisabled"
        @pointerdown.prevent
        @click="openFromToggle"
      >
        <NuiIcon icon="chevron-down" class="nui-select__chevron" />
      </NuiButton>
      <NuiButton
        v-if="showClear"
        variant="plain"
        size="xs"
        class="nui-select__clear"
        :aria-label="clearText"
        icon="x"
        @click="clear"
      />
      <NuiTree
        v-if="isTree"
        :ref="setListbox"
        v-model="model"
        v-model:values="values"
        v-model:expanded="treeExpanded"
        class="nui-select__listbox"
        variant="floating"
        :items="treeItems"
        :checkable="multiple"
        :get-key="getKey"
        :loop="loop"
        :empty-label="emptyText"
        v-bind="control.contentAttrs.value"
        @select="onSelect"
        @load="onLoad"
        @keydown.capture="onTreeKeydown"
        @focusin="onFocusin"
        @focusout="onFocusout"
      >
        <template #item="slot">
          <slot name="option" :option="slot.item" :selected="slot.selected" :active="false" />
        </template>
      </NuiTree>
      <NuiList
        v-else
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
import NuiIcon from '../icon/NuiIcon.vue';
import NuiList from '../list/NuiList.vue';
import NuiTree from '../tree/NuiTree.vue';
import { isListGroup, optionIndexOf, type NuiListGroup, type NuiOption } from '../shared/options';
import { useListboxSurface } from '../shared/use-listbox-surface';
import { useOptionSelection } from '../shared/use-option-selection';
import { ancestorValuesOf } from '../tree/flatten';
import type { NuiTreeItem } from '../tree/tree.types';
import { selectMessages } from './select.messages';
import type { NuiSelectProps } from './select.types';

type SelectEntry<T> = NuiOption<T> | NuiListGroup<NuiOption<T>> | NuiTreeItem<T>;

type OpenFocus = 'selected' | 'first' | 'last';

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
  loop = true,
  placement = 'bottom-start',
  emptyLabel,
  clearLabel,
  toggleLabel,
  countLabel,
} = defineProps<NuiSelectProps<T>>();

const model = defineModel<T | null>({ default: null });
const values = defineModel<T[]>('values', { default: () => [] });
const emit = defineEmits<{ load: [item: NuiTreeItem<T>] }>();

const split = useSplitAttrs();
const messages = useMessages(selectMessages);

const {
  frame: fieldFrame,
  field,
  attrs: controlAttrs,
  invalid: isInvalid,
  required: isRequired,
  disabled: isDisabled,
  readonly: isReadonly,
} = useFieldControl(
  () => ({ id, disabled, readonly, required, invalid, label, description, error }),
  { readonlyAttr: 'aria-readonly' },
);

const listboxId = computed(() => `${controlAttrs.value.id}-listbox`);
const entries = computed((): readonly SelectEntry<T>[] => options);

const treeItems = computed(() =>
  entries.value.flatMap((entry) => (isListGroup(entry) ? [] : [entry])),
);

const isTree = computed(() =>
  treeItems.value.some(
    (entry) => entry.children !== undefined || ('lazy' in entry && entry.lazy === true),
  ),
);

const treeExpanded = shallowRef<T[]>([]);

const {
  keyOf,
  flat,
  selectedKeys,
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
const toggleText = computed(() => toggleLabel ?? messages.value.toggle);

const showClear = computed(
  () => clearable && selectedValues.value.length > 0 && !isDisabled.value && !isReadonly.value,
);

const open = ref(false);
const triggerElement = useTemplateRef<HTMLButtonElement>('trigger');

const openFromToggle = (): void => {
  triggerElement.value?.focus();
  triggerElement.value?.click();
};

const readonlyInvoker = computed(() => (isReadonly.value ? { popovertarget: undefined } : {}));

const { listboxElement, setListbox, control, navigation, activateHovered, restActive } =
  useListboxSurface({
    anchor: triggerElement,
    open,
    id: listboxId,
    mode: 'auto',
    placement: () => placement,
    loop: () => loop,
    typeahead: true,
    isSelected: (key) => selectedKeys.value.has(key),
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

const revealSelected = (): void => {
  const known = new Set(treeExpanded.value.map(keyOf));

  const added = ancestorValuesOf(treeItems.value, selectedKeys.value, keyOf).filter(
    (value) => !known.has(keyOf(value)),
  );

  if (added.length > 0) {
    treeExpanded.value = [...treeExpanded.value, ...added];
  }
};

watch(open, (isOpen) => {
  if (!isOpen) {
    navigation.reset();
    return;
  }
  if (isTree.value) {
    revealSelected();
  } else {
    activate();
  }
});

const optionOf = (element: HTMLElement | null): NuiOption<T> | undefined =>
  element ? flat.value[optionIndexOf(element)] : undefined;

const onSelect = (): void => {
  if (!multiple) {
    control.hide();
  }
};

const onLoad = (item: NuiTreeItem<T>): void => {
  emit('load', item);
};

const clear = (): void => {
  clearSelection();
  triggerElement.value?.focus({ preventScroll: true });
};

onMounted(() => {
  watch(
    open,
    (isOpen) => {
      if (isOpen && isTree.value) {
        listboxElement.value?.focus({ preventScroll: true });
      } else if (isOpen) {
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
  if (isDisabled.value || isReadonly.value) {
    return;
  }
  const request = OPENERS[event.key];
  if (request !== undefined) {
    event.preventDefault();
    opening.set(request);
    control.show();
  } else if (event.key === 'Enter' || event.key === ' ') {
    opening.set('selected');
  } else if (!multiple && !isTree.value && isPrintable(event)) {
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

const onTreeKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Tab') {
    control.hide();
    return;
  }
  if (multiple && event.key === 'Enter') {
    event.preventDefault();
    event.stopImmediatePropagation();
    control.hide();
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
