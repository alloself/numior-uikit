<template>
  <div
    ref="root"
    class="nui-toggle-group"
    :class="[
      `nui-toggle-group--variant-${variant}`,
      `nui-toggle-group--size-${size}`,
      `nui-toggle-group--orientation-${orientation}`,
      { 'nui-toggle-group--disabled': disabled, 'nui-toggle-group--icon-only': iconOnly },
    ]"
    :role="multiple ? 'group' : 'radiogroup'"
    :aria-label="label"
    :aria-orientation="orientation === 'vertical' && !multiple ? 'vertical' : undefined"
    @keydown="navigation.onKeydown"
    @focusin="navigation.onFocusin"
    @focusout="onFocusout"
  >
    <button
      v-for="item in items"
      :key="keyOf(item.value)"
      type="button"
      class="nui-toggle-group__item"
      :class="{ 'nui-toggle-group__item--selected': isSelected(item.value) }"
      v-bind="itemAttrs(item)"
      @click="toggle(item.value)"
    >
      <slot name="item" :item="item" :selected="isSelected(item.value)">
        <NuiIcon v-if="item.icon" :alias="item.icon" class="nui-toggle-group__icon" />
        <span v-if="!iconOnly" class="nui-toggle-group__label">{{ item.label }}</span>
      </slot>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, onMounted, useTemplateRef } from 'vue';
import { useListNavigation, type AttrRecord } from '@numior/primitives';
import NuiIcon from '../icon/NuiIcon.vue';
import { useOptionSelection } from '../shared/use-option-selection';
import type { NuiToggleGroupProps, NuiToggleItem, NuiToggleItemSlot } from './toggle-group.types';

const {
  items,
  multiple = false,
  required = false,
  variant = 'outline',
  size = 'md',
  orientation = 'horizontal',
  disabled = false,
  iconOnly = false,
  label,
  getKey,
} = defineProps<NuiToggleGroupProps<T>>();

const model = defineModel<T | null>({ default: null });
const values = defineModel<T[]>('values', { default: () => [] });

defineSlots<{ item?(props: NuiToggleItemSlot<T>): unknown }>();

const root = useTemplateRef<HTMLElement>('root');

const { keyOf, selectedKeys, choose, clear } = useOptionSelection<T>({
  options: () => items,
  model,
  values,
  multiple: () => multiple,
  getKey: () => getKey,
});

const selectedItem = (): HTMLElement | null => {
  const found = root.value?.querySelector('.nui-toggle-group__item--selected');

  return found instanceof HTMLElement ? found : null;
};

const navigation = useListNavigation(root, {
  selector: '.nui-toggle-group__item',
  orientation: () => orientation,
  loop: true,
  typeahead: false,
  resting: selectedItem,
});

const isSelected = (value: T): boolean => selectedKeys.value.has(keyOf(value));

const restingKey = computed(() => {
  const enabled = items.filter((item) => !item.disabled);
  const resting = enabled.find((item) => isSelected(item.value)) ?? enabled[0];

  return resting === undefined ? undefined : keyOf(resting.value);
});

const itemAttrs = (item: NuiToggleItem<T>): AttrRecord => {
  const selected = isSelected(item.value) ? 'true' : 'false';

  return {
    ...(multiple ? { 'aria-pressed': selected } : { role: 'radio', 'aria-checked': selected }),
    'aria-label': iconOnly ? item.label : undefined,
    tabindex: restingKey.value === keyOf(item.value) ? 0 : -1,
    disabled: disabled || item.disabled,
  };
};

const toggle = (value: T): void => {
  if (multiple || !isSelected(value)) {
    choose(value);
  } else if (!required) {
    clear();
  }
};

const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;

  if (!(next instanceof Node && root.value?.contains(next))) {
    navigation.reset();
  }
};

onMounted(() => navigation.reset());
</script>
