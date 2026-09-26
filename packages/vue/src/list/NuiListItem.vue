<template>
  <li
    :id="id"
    class="nui-list-item"
    :class="classes()"
    v-bind="{ ...optionAttrs(), ...rootAttrs() }"
    @click="onClick"
  >
    <component :is="innerIs()" :ref="setAction" class="nui-list-item__inner" v-bind="innerAttrs()">
      <NuiRow
        :icon="icon"
        :title="label"
        :description="description"
        :check="isOption() ? selected : undefined"
        :nowrap="nowrap"
      >
        <template v-if="$slots.leading" #leading><slot name="leading" /></template>
        <template v-if="$slots.default" #default><slot /></template>
        <template v-if="$slots.description" #description><slot name="description" /></template>
        <template v-if="$slots.trailing || badge !== undefined" #trailing>
          <slot name="trailing">
            <NuiBadge v-if="typeof badge === 'number'" :count="badge" size="sm" />
            <NuiBadge v-else size="sm">{{ badge }}</NuiBadge>
          </slot>
        </template>
      </NuiRow>
    </component>
    <slot name="nested" />
  </li>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { useSplitAttrs, type AttrRecord } from '@numior/primitives';
import NuiBadge from '../badge/NuiBadge.vue';
import NuiLink from '../link/NuiLink.vue';
import NuiRow from '../row/NuiRow.vue';
import { useTriggerElement } from '../shared/trigger-ref';
import { useList } from './list-context';
import type { NuiListItemProps } from './list.types';

type ListItemMode = 'option' | 'link' | 'button' | 'plain';

defineOptions({ inheritAttrs: false });

const {
  value,
  id,
  label,
  description,
  icon,
  href,
  to,
  as = 'a',
  interactive = false,
  disabled = false,
  current = false,
  badge,
} = defineProps<NuiListItemProps>();

const attrs = useAttrs();
const split = useSplitAttrs();
const list = useList();
const { trigger: action, setTrigger: setAction } = useTriggerElement();

const size = computed(() => list?.size.value ?? 'md');
const selected = computed(() => value !== undefined && (list?.isSelected(value) ?? false));
const active = computed(() => id !== undefined && list?.activeId.value === id);

const nowrap = computed(() => list?.variant.value === 'floating' || list?.variant.value === 'nav');

const tabStop = computed(
  () => list !== null && value !== undefined && list.tabStopKey.value === list.keyOf(value),
);

const mode = (): ListItemMode => {
  if (list?.selectable.value !== undefined && value !== undefined) {
    return 'option';
  }
  if (href !== undefined || to !== undefined) {
    return 'link';
  }
  return interactive || attrs.onClick !== undefined ? 'button' : 'plain';
};

const isOption = (): boolean => mode() === 'option';
const hasAction = (): boolean => mode() === 'link' || mode() === 'button';

const classes = () => [
  `nui-list-item--size-${size.value}`,
  `nui-list-item--mode-${mode()}`,
  {
    'nui-list-item--selected': selected.value,
    'nui-list-item--active': active.value,
    'nui-list-item--current': current,
    'nui-list-item--disabled': disabled,
  },
];

const optionAttrs = (): AttrRecord =>
  isOption()
    ? {
        role: 'option',
        tabindex: tabStop.value ? 0 : -1,
        'aria-selected': selected.value,
        'aria-disabled': disabled ? 'true' : undefined,
      }
    : {};

const rootAttrs = (): AttrRecord => (hasAction() ? split.rootAttrs() : attrs);

const innerIs = () => {
  switch (mode()) {
    case 'link':
      return NuiLink;
    case 'button':
      return 'button';
    case 'option':
    case 'plain':
      return 'div';
  }
};

const innerAttrs = (): AttrRecord => {
  const page = current ? { 'aria-current': 'page' } : {};

  switch (mode()) {
    case 'link':
      return {
        as,
        href,
        to,
        tone: 'neutral',
        underline: 'none',
        disabled,
        class: 'nui-list-item__action',
        ...page,
        ...split.controlAttrs(),
      };
    case 'button':
      return {
        type: 'button',
        disabled,
        class: 'nui-list-item__action',
        ...page,
        ...split.controlAttrs(),
      };
    case 'option':
    case 'plain':
      return {};
  }
};

const onClick = (): void => {
  if (mode() === 'option' && !disabled && value !== undefined) {
    list?.select(value);
  }
};

defineExpose({ action });
</script>
