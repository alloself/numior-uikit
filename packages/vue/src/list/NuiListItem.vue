<template>
  <li
    :id="id"
    class="nui-list-item"
    :class="classes()"
    v-bind="{ ...optionAttrs(), ...rootAttrs() }"
    @click="onClick"
  >
    <component :is="innerIs()" class="nui-list-item__inner" v-bind="innerAttrs()">
      <NuiRow
        :icon="icon"
        :title="label"
        :description="description"
        :check="isOption() ? selected : undefined"
        :nowrap="list?.variant.value === 'floating'"
      >
        <template v-if="$slots.leading" #leading><slot name="leading" /></template>
        <template v-if="$slots.default" #default><slot /></template>
        <template v-if="$slots.description" #description><slot name="description" /></template>
        <template v-if="$slots.trailing" #trailing><slot name="trailing" /></template>
      </NuiRow>
    </component>
  </li>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { useSplitAttrs, type AttrRecord } from '@numior/primitives';
import NuiLink from '../link/NuiLink.vue';
import NuiRow from '../row/NuiRow.vue';
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
} = defineProps<NuiListItemProps>();

const attrs = useAttrs();
const split = useSplitAttrs();
const list = useList();

const size = computed(() => list?.size.value ?? 'md');
const selected = computed(() => value !== undefined && (list?.isSelected(value) ?? false));
const active = computed(() => id !== undefined && list?.activeId.value === id);
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
  const current = mode();
  if (current === 'link') {
    return NuiLink;
  }
  return current === 'button' ? 'button' : 'div';
};
const innerAttrs = (): AttrRecord => {
  const current = mode();
  if (current === 'link') {
    return {
      as,
      href,
      to,
      tone: 'neutral',
      underline: 'none',
      disabled,
      class: 'nui-list-item__action',
      ...split.controlAttrs(),
    };
  }
  if (current === 'button') {
    return { type: 'button', disabled, class: 'nui-list-item__action', ...split.controlAttrs() };
  }
  return {};
};
const onClick = (): void => {
  if (mode() === 'option' && !disabled && value !== undefined) {
    list?.select(value);
  }
};
</script>
