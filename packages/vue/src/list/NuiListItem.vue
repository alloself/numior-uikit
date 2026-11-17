<template>
  <li
    :id="id"
    :ref="setRoot"
    class="nui-list-item"
    :class="classes()"
    v-bind="{ ...roleAttrs(), ...rootAttrs() }"
    @click="onClick"
  >
    <component :is="innerIs()" :ref="bindAction" class="nui-list-item__inner" v-bind="innerAttrs()">
      <NuiRow
        ref="row"
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
import { computed, onUpdated, useAttrs, useTemplateRef, type ComponentPublicInstance } from 'vue';
import { useSplitAttrs, type AttrRecord } from '@numior/primitives';
import NuiBadge from '../badge/NuiBadge.vue';
import { NuiBadgeVariant } from '../badge/badge.types';
import NuiKbd from '../kbd/NuiKbd.vue';
import NuiLink from '../link/NuiLink.vue';
import NuiRow from '../row/NuiRow.vue';
import { NuiTone } from '../shared/scale.types';
import { useTriggerElement } from '../shared/trigger-ref';
import { useList, type ListItemKey } from './list-context';
import { ListContextKind, ListItemMode, NuiListVariant, type NuiListItemProps } from './list.types';

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
const inTree = list?.kind === ListContextKind.Tree;
const { trigger: action, setTrigger: setAction } = useTriggerElement();

const size = computed(() => list?.size.value ?? 'md');
const selected = computed(() => value !== undefined && (list?.isSelected(value) ?? false));
const active = computed(() => id !== undefined && list?.activeId.value === id);

const treeNode = computed(() =>
  list?.kind === ListContextKind.Tree && value !== undefined ? list.nodeOf(value) : undefined,
);

const nowrap = computed(
  () =>
    inTree ||
    list?.variant.value === NuiListVariant.Floating ||
    list?.variant.value === NuiListVariant.Nav,
);

const tabStop = computed(
  () =>
    list?.kind === ListContextKind.List &&
    value !== undefined &&
    list.tabStopKey.value === list.keyOf(value),
);

const mode = (): ListItemMode => {
  if (inTree) {
    return ListItemMode.TreeItem;
  }
  if (list?.selectable.value !== undefined && value !== undefined) {
    return ListItemMode.Option;
  }
  if (href !== undefined || to !== undefined) {
    return ListItemMode.Link;
  }
  return interactive || attrs.onClick !== undefined ? ListItemMode.Button : ListItemMode.Plain;
};

const isOption = (): boolean => mode() === ListItemMode.Option;
const hasAction = (): boolean => mode() === ListItemMode.Link || mode() === ListItemMode.Button;

const row = useTemplateRef<InstanceType<typeof NuiRow>>('row');
const ownKey = Symbol('list-item');
let rootElement: HTMLElement | null = null;
let registered: ListItemKey | undefined;
let registeredElement: HTMLElement | null = null;

const titleText = (): string => row.value?.titleElement?.textContent ?? label ?? '';

const navigable = (): HTMLElement | null => {
  switch (mode()) {
    case ListItemMode.Option:
      return rootElement;
    case ListItemMode.Link:
    case ListItemMode.Button:
      return action.value;
    case ListItemMode.TreeItem:
    case ListItemMode.Plain:
      return null;
  }
};

const register = (): void => {
  if (list?.kind !== ListContextKind.List) {
    return;
  }

  const key = isOption() && value !== undefined ? list.keyOf(value) : ownKey;
  const element = navigable();

  if (registered !== undefined && (registered !== key || element !== registeredElement)) {
    list.items.elements.release(registered, registeredElement);
  }

  registered = element === null ? undefined : key;
  registeredElement = element;

  if (element === null) {
    return;
  }

  list.items.elements.set(key, element);
  list.items.titles.set(element, titleText);
};

const setRoot = (element: Element | ComponentPublicInstance | null): void => {
  rootElement = element instanceof HTMLElement ? element : null;
  register();
};

const bindAction = (element: Element | ComponentPublicInstance | null): void => {
  setAction(element);
  register();
};

const showsCheck = (): boolean =>
  isOption() ||
  (inTree &&
    list?.variant.value === NuiListVariant.Floating &&
    treeNode.value?.checked === undefined);

const badgeLook = computed(() => ({
  tone: current ? NuiTone.Primary : NuiTone.Neutral,
  variant: NuiBadgeVariant.Solid,
}));

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
    case ListItemMode.TreeItem:
      return treeAttrs();
    case ListItemMode.Option:
      return {
        role: 'option',
        tabindex: tabStop.value ? 0 : -1,
        'aria-selected': selected.value,
        'aria-disabled': disabled ? 'true' : undefined,
      };
    case ListItemMode.Link:
    case ListItemMode.Button:
    case ListItemMode.Plain:
      return {};
  }
};

const rootAttrs = (): AttrRecord => (hasAction() ? split.rootAttrs() : attrs);

const innerIs = () => {
  switch (mode()) {
    case ListItemMode.Link:
      return NuiLink;
    case ListItemMode.Button:
      return 'button';
    case ListItemMode.TreeItem:
    case ListItemMode.Option:
    case ListItemMode.Plain:
      return 'div';
  }
};

const innerAttrs = (): AttrRecord => {
  const page = current ? { 'aria-current': 'page' } : {};

  switch (mode()) {
    case ListItemMode.Link:
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
    case ListItemMode.Button:
      return {
        type: 'button',
        disabled,
        class: 'nui-list-item__action',
        ...page,
        ...split.controlAttrs(),
      };
    case ListItemMode.TreeItem:
    case ListItemMode.Option:
    case ListItemMode.Plain:
      return {};
  }
};

const onClick = (): void => {
  if (
    list?.kind !== ListContextKind.List ||
    mode() !== ListItemMode.Option ||
    disabled ||
    value === undefined
  ) {
    return;
  }

  list.select(value);
};

onUpdated(register);

defineExpose({ action });
</script>
