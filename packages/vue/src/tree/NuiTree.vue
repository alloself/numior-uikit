<template>
  <div
    :id="baseId"
    ref="root"
    class="nui-tree"
    :class="[
      `nui-tree--size-${size}`,
      {
        'nui-tree--virtual': virtual,
        'nui-tree--checkable': checkable,
        'nui-tree--multiple': mode === 'multiple',
      },
    ]"
    role="tree"
    tabindex="0"
    :aria-label="label"
    :aria-labelledby="labelledBy"
    :aria-multiselectable="mode === 'multiple' || undefined"
    :aria-activedescendant="activeDescendant"
    :style="rootStyle"
    @keydown="navigation.onKeydown"
    @focus="onFocus"
    @pointerdown="onPointerdown"
    @click="onClick"
    @dblclick="onDblclick"
  >
    <component
      :is="virtual ? 'div' : TransitionGroup"
      class="nui-tree__list"
      :style="listStyle"
      v-bind="virtual ? {} : FOLDING"
    >
      <NuiTreeNode
        v-for="entry in rendered"
        :id="nodeId(entry.node.key)"
        :key="entry.node.key"
        :node="entry.node"
        :active="entry.index === activeIndex"
        :selected="selectedKeys.has(entry.node.key)"
        :selectable="mode !== false"
        :checked="checkable ? checkStates.get(entry.node.key) : undefined"
        :icon="iconFor(entry.node)"
        :folder="folderFor(entry.node)"
        :start="entry.start"
        :revealing="revealing.has(entry.node.key)"
      >
        <template #default="slot"><slot name="item" v-bind="slot" /></template>
      </NuiTreeNode>
    </component>
  </div>
</template>

<script setup lang="ts" generic="T">
import {
  TransitionGroup,
  computed,
  onMounted,
  ref,
  shallowReactive,
  useTemplateRef,
  watch,
} from 'vue';
import { useControlId, useDirection, useVirtualList, type IconAlias } from '@numior/primitives';
import { useOptionSelection } from '../shared/use-option-selection';
import NuiTreeNode from './NuiTreeNode.vue';
import { applyCheck, checkStates as checkStatesOf, collectCheckedValues } from './cascade';
import { flattenTree, siblingIndicesOf, type TreeNode } from './flatten';
import type { NuiTreeItem, NuiTreeProps } from './tree.types';
import { useTreeNavigation, type TreeActivationKey } from './use-tree-navigation';

interface RenderedNode {
  readonly node: TreeNode<T>;
  readonly index: number;
  readonly start: number | undefined;
}

const afterPaint = (callback: () => void): void => {
  if (typeof requestAnimationFrame === 'undefined') {
    callback();
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(callback));
};

const FOLDING = {
  tag: 'div',
  enterFromClass: 'nui-tree__item--folded',
  enterActiveClass: 'nui-tree__item--entering',
  enterToClass: 'nui-tree__item--unfolded',
  leaveFromClass: 'nui-tree__item--unfolded',
  leaveActiveClass: 'nui-tree__item--leaving',
  leaveToClass: 'nui-tree__item--folded',
} as const;

const {
  id,
  items,
  getKey,
  selectable = undefined,
  checkable = false,
  icons = true,
  virtual = false,
  height,
  itemHeight = 32,
  size = 'md',
  loop = false,
  typeahead = true,
  label,
  labelledBy,
} = defineProps<NuiTreeProps<T>>();

const model = defineModel<T | null>({ default: null });
const values = defineModel<T[]>('values', { default: () => [] });
const expanded = defineModel<T[]>('expanded', { default: () => [] });
const checked = defineModel<T[]>('checked', { default: () => [] });

const emit = defineEmits<{
  expand: [item: NuiTreeItem<T>];
  collapse: [item: NuiTreeItem<T>];
  load: [item: NuiTreeItem<T>];
  select: [item: NuiTreeItem<T>];
}>();

const baseId = useControlId(() => id);
const root = useTemplateRef<HTMLElement>('root');
const mounted = ref(false);
const mode = computed(() => (selectable === undefined ? 'single' : selectable));

const { keyOf, selectedKeys, selectedValues, choose } = useOptionSelection<T>({
  options: () => [],
  model,
  values,
  multiple: () => mode.value === 'multiple',
  getKey: () => getKey,
});

const expandedKeys = computed(() => new Set(expanded.value.map(keyOf)));
const checkedKeys = computed(() => new Set(checked.value.map(keyOf)));

const checkStates = computed(() =>
  checkable ? checkStatesOf(items, checkedKeys.value, keyOf) : new Map(),
);

const pending = shallowReactive(new Set<string>());
const revealing = shallowReactive(new Set<string>());
const visible = computed(() => flattenTree(items, keyOf, expandedKeys.value, pending));
const activeKey = ref<string>();
const indexByKey = computed(() => new Map(visible.value.map((node, index) => [node.key, index])));

const activeIndex = computed(() =>
  activeKey.value === undefined ? -1 : (indexByKey.value.get(activeKey.value) ?? -1),
);

const nodeId = (key: string): string => `${baseId.value}-node-${encodeURIComponent(key)}`;

const activeDescendant = computed(() => {
  const node = visible.value[activeIndex.value];
  return mounted.value && node ? nodeId(node.key) : undefined;
});

const windowing = useVirtualList(root, {
  count: () => visible.value.length,
  itemSize: () => itemHeight,
  enabled: () => virtual,
  pinned: () => (activeIndex.value >= 0 ? activeIndex.value : undefined),
});

const rendered = computed<RenderedNode[]>(() =>
  virtual
    ? windowing.items.value.flatMap(({ index, start }) => {
        const node = visible.value[index];
        return node ? [{ node, index, start }] : [];
      })
    : visible.value.map((node, index) => ({ node, index, start: undefined })),
);

const rootStyle = computed(() => ({
  '--_height': height,
  ...(virtual ? { '--_row': `${itemHeight}px` } : {}),
}));

const listStyle = computed(() =>
  virtual ? { blockSize: `${windowing.totalSize.value}px` } : undefined,
);

const folderFor = (node: TreeNode<T>): boolean =>
  icons && node.item.icon === undefined && node.hasChildren;

const iconFor = (node: TreeNode<T>): IconAlias | undefined => {
  if (!icons || node.item.icon === false) {
    return undefined;
  }
  if (node.item.icon) {
    return node.item.icon;
  }
  return node.hasChildren ? undefined : 'file';
};

const revealNode = (index: number): void => {
  if (virtual) {
    windowing.scrollTo(index);
    return;
  }
  const node = visible.value[index];
  const element = node ? document.getElementById(nodeId(node.key)) : null;
  element?.scrollIntoView?.({ block: 'nearest' });
};

const setActive = (index: number): void => {
  activeKey.value = visible.value[index]?.key;
  revealNode(index);
};

const { isRtl } = useDirection(root);

const revealAdded = (added: readonly string[]): void => {
  for (const key of added) {
    revealing.add(key);
  }

  afterPaint(() => {
    for (const key of added) {
      revealing.delete(key);
    }
  });
};

watch(visible, (next, previous) => {
  if (!virtual) {
    return;
  }
  const before = new Set(previous.map((node) => node.key));
  revealAdded(next.flatMap((node) => (before.has(node.key) ? [] : [node.key])));
});

const expandItems = (targets: readonly TreeNode<T>[]): void => {
  const fresh = targets.filter((node) => node.hasChildren && !node.expanded);
  if (fresh.length === 0) {
    return;
  }
  for (const node of fresh) {
    if (node.item.lazy && node.item.children === undefined) {
      pending.add(node.key);
      emit('load', node.item);
    }
  }
  expanded.value = [...expanded.value, ...fresh.map((node) => node.item.value)];
  for (const node of fresh) {
    emit('expand', node.item);
  }
};

const expandNode = (index: number): void => {
  const node = visible.value[index];
  if (node) {
    expandItems([node]);
  }
};

const collapseNode = (index: number): void => {
  const node = visible.value[index];
  if (!node || !node.expanded) {
    return;
  }
  expanded.value = expanded.value.filter((value) => keyOf(value) !== node.key);
  emit('collapse', node.item);
};

const toggleExpand = (index: number): void => {
  if (visible.value[index]?.expanded) {
    collapseNode(index);
  } else {
    expandNode(index);
  }
};

const expandSiblings = (index: number): void => {
  const nodes = visible.value;
  expandItems(siblingIndicesOf(nodes, index).flatMap((position) => nodes[position] ?? []));
};

const toggleCheck = (node: TreeNode<T>): void => {
  const next = applyCheck(items, checkedKeys.value, node.item, keyOf);
  checked.value = collectCheckedValues(items, next, keyOf);
};

const activate = (index: number, key: TreeActivationKey): void => {
  const node = visible.value[index];
  if (!node || node.item.disabled) {
    return;
  }
  if (checkable && (key === ' ' || mode.value === false)) {
    toggleCheck(node);
    return;
  }
  if (mode.value === false) {
    return;
  }
  choose(node.item.value);
  emit('select', node.item);
};

const navigation = useTreeNavigation<T>({
  nodes: () => visible.value,
  activeIndex: () => activeIndex.value,
  rtl: isRtl,
  loop: () => loop,
  typeahead: () => typeahead,
  pageSize: () => (virtual ? Math.max(1, Math.floor(windowing.viewport.value / itemHeight)) : 10),
  onExpand: expandNode,
  onCollapse: collapseNode,
  onExpandSiblings: expandSiblings,
  onActivate: activate,
  onMove: setActive,
});

const onFocus = (): void => {
  if (activeIndex.value >= 0) {
    return;
  }
  const nodes = visible.value;
  const selected = nodes.find((node) => selectedKeys.value.has(node.key) && !node.item.disabled);
  activeKey.value = (selected ?? nodes.find((node) => !node.item.disabled))?.key;
};

const hitNode = (event: Event): number => {
  const element =
    event.target instanceof Element ? event.target.closest('[role="treeitem"]') : null;

  const prefix = `${baseId.value}-node-`;

  return element?.id.startsWith(prefix)
    ? (indexByKey.value.get(decodeURIComponent(element.id.slice(prefix.length))) ?? -1)
    : -1;
};

const partOf = (event: Event, part: string): boolean =>
  event.target instanceof Element && event.target.closest(`.nui-tree__${part}`) !== null;

const onPointerdown = (event: PointerEvent): void => {
  const node = visible.value[hitNode(event)];
  if (node && !node.item.disabled) {
    activeKey.value = node.key;
  }
};

const onClick = (event: MouseEvent): void => {
  const index = hitNode(event);
  const node = visible.value[index];
  if (!node || node.item.disabled) {
    return;
  }
  activeKey.value = node.key;
  if (partOf(event, 'toggle')) {
    toggleExpand(index);
  } else if (partOf(event, 'checkbox')) {
    toggleCheck(node);
  } else {
    activate(index, 'Enter');
  }
};

const onDblclick = (event: MouseEvent): void => {
  const index = hitNode(event);
  const node = visible.value[index];
  if (node && !node.item.disabled && !partOf(event, 'toggle') && !partOf(event, 'checkbox')) {
    toggleExpand(index);
  }
};

onMounted(() => {
  mounted.value = true;
  if (selectedValues.value.length > 0) {
    onFocus();
  }
});
</script>
