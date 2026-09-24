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
    @click="onClick"
    @dblclick="onDblclick"
  >
    <div class="nui-tree__list" :style="listStyle">
      <NuiTreeNode
        v-for="entry in rendered"
        :id="nodeId(entry.node.key)"
        :key="entry.node.key"
        :node="entry.node"
        :active="entry.index === activeIndex"
        :selected="selectedKeys.has(entry.node.key)"
        :selectable="mode !== false"
        :checked="checkable ? checkStateOf(entry.node.item, checkedKeys, keyOf) : undefined"
        :icon="iconFor(entry.node)"
        :start="entry.start"
      >
        <template #default="slot"><slot name="item" v-bind="slot" /></template>
      </NuiTreeNode>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, onMounted, ref, shallowReactive, useTemplateRef } from 'vue';
import { useControlId, useVirtualList, type IconAlias } from '@numior/primitives';
import { useOptionSelection } from '../shared/use-option-selection';
import NuiTreeNode from './NuiTreeNode.vue';
import { applyCheck, checkStateOf, collectCheckedValues } from './cascade';
import { flattenTree, siblingIndicesOf, type TreeNode } from './flatten';
import type { NuiTreeItem, NuiTreeProps } from './tree.types';
import { useTreeNavigation, type TreeActivationKey } from './use-tree-navigation';

interface RenderedNode {
  readonly node: TreeNode<T>;
  readonly index: number;
  readonly start: number | undefined;
}

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
const model = defineModel<T | T[]>();
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
const { keyOf, selectedKeys, selectedValues, toggle } = useOptionSelection<T>({
  options: () => [],
  model,
  multiple: () => mode.value === 'multiple',
  getKey: () => getKey,
});
const expandedKeys = computed(() => new Set(expanded.value.map(keyOf)));
const checkedKeys = computed(() => new Set(checked.value.map(keyOf)));
const pending = shallowReactive(new Set<string>());
const visible = computed(() => flattenTree(items, keyOf, expandedKeys.value, pending));
const activeKey = ref<string>();
const activeIndex = computed(() => visible.value.findIndex((node) => node.key === activeKey.value));
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

const iconFor = (node: TreeNode<T>): IconAlias | undefined => {
  if (!icons || node.item.icon === false) {
    return undefined;
  }
  if (node.item.icon) {
    return node.item.icon;
  }
  if (!node.hasChildren) {
    return 'file';
  }
  return node.expanded ? 'folder-open' : 'folder';
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
const isRtl = (): boolean => root.value?.closest('[dir]')?.getAttribute('dir') === 'rtl';

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
  if (mode.value === 'multiple') {
    toggle({ value: node.item.value, label: node.item.label });
  } else {
    model.value = node.item.value;
  }
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
  return element ? visible.value.findIndex((node) => nodeId(node.key) === element.id) : -1;
};
const partOf = (event: Event, part: string): boolean =>
  event.target instanceof Element && event.target.closest(`.nui-tree__${part}`) !== null;
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
