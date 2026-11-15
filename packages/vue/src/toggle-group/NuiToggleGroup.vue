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
    :aria-orientation="
      orientation === NuiToggleGroupOrientation.Vertical && !multiple ? 'vertical' : undefined
    "
    @keydown="navigation.onKeydown"
    @focusin="navigation.onFocusin"
    @focusout="onFocusout"
  >
    <span
      ref="startEdge"
      class="nui-toggle-group__edge nui-toggle-group__edge--start"
      aria-hidden="true"
      @mousedown.prevent
    >
      <NuiButton
        variant="ghost"
        tone="neutral"
        size="sm"
        icon="chevron-left"
        class="nui-toggle-group__scroll"
        tabindex="-1"
        @click="page(-1)"
      />
    </span>
    <div ref="track" class="nui-toggle-group__track">
      <NuiTooltip
        v-for="item in items"
        :key="keyOf(item.value)"
        :disabled="!iconOnly"
        :placement="tooltipPlacement"
      >
        <template #trigger="{ attrs }">
          <button
            type="button"
            class="nui-toggle-group__item"
            :class="{ 'nui-toggle-group__item--selected': isSelected(item.value) }"
            v-bind="{
              ...itemAttrs(item),
              ...attrs,
              'aria-describedby': undefined,
              ref: buttons.ref(keyOf(item.value), attrs.ref),
            }"
            @click="toggle(item.value)"
          >
            <slot name="item" :item="item" :selected="isSelected(item.value)">
              <NuiIcon v-if="item.icon" :icon="item.icon" class="nui-toggle-group__icon" />
              <span v-if="!iconOnly" class="nui-toggle-group__label">{{ item.label }}</span>
            </slot>
          </button>
        </template>
        {{ item.label }}
      </NuiTooltip>
    </div>
    <span
      ref="endEdge"
      class="nui-toggle-group__edge nui-toggle-group__edge--end"
      aria-hidden="true"
      @mousedown.prevent
    >
      <NuiButton
        variant="ghost"
        tone="neutral"
        size="sm"
        icon="chevron-right"
        class="nui-toggle-group__scroll"
        tabindex="-1"
        @click="page(1)"
      />
    </span>
  </div>
</template>

<script setup lang="ts" generic="T">
import { useMounted, useResizeObserver } from '@vueuse/core';
import { computed, onMounted, onUpdated, shallowRef, useTemplateRef, watch } from 'vue';
import {
  createCollection,
  FloatingPlacement,
  useDirection,
  useListNavigation,
  type AttrRecord,
} from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiTooltip from '../tooltip/NuiTooltip.vue';
import { useEdgeScroll } from '../shared/use-edge-scroll';
import { useOptionSelection } from '../shared/use-option-selection';
import {
  NuiToggleGroupOrientation,
  NuiToggleGroupVariant,
  type NuiToggleGroupProps,
  type NuiToggleItem,
  type NuiToggleItemSlot,
} from './toggle-group.types';
import { NuiSize } from '../shared/scale.types';

const {
  items,
  multiple = false,
  required = false,
  variant = NuiToggleGroupVariant.Outline,
  size = NuiSize.Md,
  orientation = NuiToggleGroupOrientation.Horizontal,
  disabled = false,
  iconOnly = false,
  label,
  getKey,
} = defineProps<NuiToggleGroupProps<T>>();

const model = defineModel<T | null>({ default: null });
const values = defineModel<T[]>('values', { default: () => [] });

defineSlots<{ item?(props: NuiToggleItemSlot<T>): unknown }>();

const root = useTemplateRef<HTMLElement>('root');
const track = useTemplateRef<HTMLElement>('track');
const startEdge = useTemplateRef<HTMLElement>('startEdge');
const endEdge = useTemplateRef<HTMLElement>('endEdge');
const direction = useDirection(root);
const mounted = useMounted();

const { keyOf, selectedKeys, choose, clear } = useOptionSelection<T>({
  options: () => items,
  model,
  values,
  multiple: () => multiple,
  getKey: () => getKey,
});

const buttons = createCollection<string>();
const itemElements = shallowRef<HTMLElement[]>([]);
let seenItems: readonly HTMLElement[] = [];

const isSelected = (value: T): boolean => selectedKeys.value.has(keyOf(value));

const restingKey = computed(() => {
  let first: NuiToggleItem<T> | undefined;

  for (const item of items) {
    if (item.disabled) {
      continue;
    }
    if (isSelected(item.value)) {
      return keyOf(item.value);
    }
    first ??= item;
  }

  return first === undefined ? undefined : keyOf(first.value);
});

const tooltipPlacement = computed(() => {
  if (orientation !== NuiToggleGroupOrientation.Vertical) {
    return FloatingPlacement.Bottom;
  }
  return mounted.value && direction.isRtl() ? FloatingPlacement.Left : FloatingPlacement.Right;
});

const restingButton = (): HTMLElement | undefined =>
  restingKey.value === undefined ? undefined : buttons.get(restingKey.value);

const { markOverflow, page, follow, keepFollowed, glide } = useEdgeScroll({
  block: 'nui-toggle-group',
  root,
  track,
  startEdge,
  endEdge,
  direction,
  enabled: () => orientation !== NuiToggleGroupOrientation.Vertical,
});

const navigation = useListNavigation(root, {
  items: buttons.elements,
  orientation: () => orientation,
  loop: true,
  typeahead: false,
  resting: restingButton,
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

const isLastSelected = (value: T): boolean => isSelected(value) && selectedKeys.value.size === 1;

const toggle = (value: T): void => {
  if (required && isLastSelected(value)) {
    return;
  }
  if (multiple || !isSelected(value)) {
    choose(value);
  } else {
    clear();
  }
};

const refit = (): void => {
  markOverflow();
  keepFollowed();
};

const collect = (): void => {
  const found = buttons.elements();

  if (found === seenItems) {
    return;
  }

  seenItems = found;
  itemElements.value = [...found];
};

const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;

  if (next instanceof Node && root.value?.contains(next)) {
    return;
  }

  navigation.reset();
};

onMounted(() => {
  navigation.reset();
  collect();
  follow(restingButton, 'instant');
  markOverflow();

  watch(model, () => follow(restingButton, glide()), { flush: 'post' });

  watch(() => orientation, markOverflow, { flush: 'post' });

  useResizeObserver(track, refit);
  useResizeObserver(itemElements, refit);
});

onUpdated(collect);
</script>
