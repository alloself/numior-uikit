<template>
  <li
    :id="id"
    class="nui-list-item"
    :class="classes()"
    v-bind="{ ...roleAttrs(), ...rootAttrs() }"
    @click="onClick"
  >
    <component :is="innerIs()" :ref="setAction" class="nui-list-item__inner" v-bind="innerAttrs()">
      <NuiRow
        :icon="icon"
        :title="label"
        :description="description"
        :check="showsCheck() ? selected : undefined"
        :nowrap="nowrap"
        :inline="inTree"
      >
        <template v-if="$slots.leading" #leading><slot name="leading" /></template>
        <template v-if="$slots.default" #default>
          <slot :selected="selected" :active="active" />
        </template>
        <template v-if="$slots.description" #description><slot name="description" /></template>
        <template v-if="$slots.trailing || badge !== undefined || shortcut !== undefined" #trailing>
          <slot name="trailing">
            <NuiKbd v-if="shortcut !== undefined" :keys="shortcut" size="sm" />
            <NuiBadge
              v-else-if="typeof badge === 'number'"
              :count="badge"
              v-bind="badgeLook"
              size="sm"
            />
            <NuiBadge v-else v-bind="badgeLook" size="sm">{{ badge }}</NuiBadge>
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
import NuiKbd from '../kbd/NuiKbd.vue';
import NuiLink from '../link/NuiLink.vue';
import NuiRow from '../row/NuiRow.vue';
import { useTriggerElement } from '../shared/trigger-ref';
import { useList } from './list-context';
import type { NuiListItemProps } from './list.types';

type ListItemMode = 'treeitem' | 'option' | 'link' | 'button' | 'plain';

defineOptions({ inheritAttrs: false });

const {
  value,
  id,
  label,
  description,
  icon,
  href,
  to,
  as,
  interactive = false,
  disabled = false,
  current = false,
  badge,
  shortcut,
} = defineProps<NuiListItemProps>();

const attrs = useAttrs();
const split = useSplitAttrs();
const list = useList();
const inTree = list?.kind === 'tree';
const { trigger: action, setTrigger: setAction } = useTriggerElement();

const size = computed(() => list?.size.value ?? 'md');
const selected = computed(() => value !== undefined && (list?.isSelected(value) ?? false));
const active = computed(() => id !== undefined && list?.activeId.value === id);

const treeNode = computed(() =>
  list?.kind === 'tree' && value !== undefined ? list.nodeOf(value) : undefined,
);

const nowrap = computed(
  () => inTree || list?.variant.value === 'floating' || list?.variant.value === 'nav',
);

const tabStop = computed(
  () => list?.kind === 'list' && value !== undefined && list.tabStopKey.value === list.keyOf(value),
);

const mode = (): ListItemMode => {
  if (inTree) {
    return 'treeitem';
  }
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

const showsCheck = (): boolean =>
  isOption() ||
  (inTree && list?.variant.value === 'floating' && treeNode.value?.checked === undefined);

const badgeLook = computed(() =>
  current ? { tone: 'primary' as const, variant: 'solid' as const } : {},
);

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

const treeAttrs = (): AttrRecord => {
  const node = treeNode.value;

  return {
    role: 'treeitem',
    'aria-level': node?.level,
    'aria-setsize': node?.setSize,
    'aria-posinset': node?.posInSet,
    'aria-expanded': node?.expanded,
    'aria-selected': list?.selectable.value === undefined ? undefined : selected.value,
    'aria-checked': node?.checked,
    'aria-busy': node?.loading || undefined,
    'aria-disabled': disabled ? 'true' : undefined,
    'aria-current': current ? 'true' : undefined,
  };
};

const roleAttrs = (): AttrRecord => {
  switch (mode()) {
    case 'treeitem':
      return treeAttrs();
    case 'option':
      return {
        role: 'option',
        tabindex: tabStop.value ? 0 : -1,
        'aria-selected': selected.value,
        'aria-disabled': disabled ? 'true' : undefined,
      };
    case 'link':
    case 'button':
    case 'plain':
      return {};
  }
};

const rootAttrs = (): AttrRecord => (hasAction() ? split.rootAttrs() : attrs);

const innerIs = () => {
  switch (mode()) {
    case 'link':
      return NuiLink;
    case 'button':
      return 'button';
    case 'treeitem':
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
    case 'treeitem':
    case 'option':
    case 'plain':
      return {};
  }
};

const onClick = (): void => {
  if (list?.kind === 'list' && mode() === 'option' && !disabled && value !== undefined) {
    list.select(value);
  }
};

defineExpose({ action });
</script>
