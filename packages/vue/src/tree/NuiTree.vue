<template>
  <div
    :id="baseId"
    ref="root"
    class="nui-list nui-tree"
    :class="[
      `nui-list--variant-${variant}`,
      `nui-tree--size-${size}`,
      {
        'nui-layer': variant === NuiTreeVariant.Floating,
        'nui-tree--virtual': virtual,
        'nui-tree--checkable': checkable,
        'nui-tree--multiple': mode === NuiTreeSelectable.Multiple,
      },
    ]"
    :role="widget ? 'tree' : undefined"
    :tabindex="widget ? 0 : undefined"
    :aria-label="widget ? label : undefined"
    :aria-labelledby="widget ? labelledBy : undefined"
    :aria-multiselectable="(widget && mode === NuiTreeSelectable.Multiple) || undefined"
    :aria-activedescendant="activeDescendant"
    :aria-busy="loading || undefined"
    :style="rootStyle"
    @keydown="onKeydown"
    @focus="onFocus"
    @blur="onBlur"
    @pointerdown="onPointerdown"
    @click="onClick"
    @dblclick="onDblclick"
  >
    <component
      :is="virtual ? 'ul' : TransitionGroup"
      class="nui-list__items nui-tree__list"
      role="presentation"
      :style="windowFrame.windowStyle.value"
      v-bind="virtual ? {} : FOLDING"
    >
      <NuiTreeNode
        v-for="entry in rendered"
        :id="nodeId(entry.node.key)"
        :key="entry.key"
        :node="entry.node"
        :checked="checkable ? checkStates.get(entry.node.key) : undefined"
        :icon="iconFor(entry.node)"
        :folder="folderFor(entry.node)"
        :revealing="revealing.has(entry.node.key)"
      >
        <template v-if="$slots.item" #default="slot"><slot name="item" v-bind="slot" /></template>
      </NuiTreeNode>
      <li v-if="loading" key="status" class="nui-list__status" role="presentation">
        <NuiIcon icon="loader" class="nui-list__spinner" />
        {{ loadingText }}
      </li>
      <li v-else-if="isEmpty" key="empty" class="nui-list__empty" role="presentation">
        <slot name="empty"><NuiEmpty size="sm" :title="emptyText" /></slot>
      </li>
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
import {
  AriaValue,
  useControlId,
  useDirection,
  useMessages,
  useVirtualFrame,
  useVirtualList,
  type IconSource,
} from '@numior/primitives';
import NuiEmpty from '../empty/NuiEmpty.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { provideList, type TreeItemState } from '../list/list-context';
import { listMessages } from '../list/list.messages';
import { NuiSize } from '../shared/scale.types';
import { useOptionSelection } from '../shared/use-option-selection';
import NuiTreeNode from './NuiTreeNode.vue';
import {
  applyCheck,
  checkStates as checkStatesOf,
  collectCheckedValues,
  completeChecked,
  sameKeys,
} from './cascade';
import { findTreeItem, flattenTree, siblingIndicesOf, type TreeNode } from './flatten';
import {
  CheckState,
  NuiTreeSelectable,
  NuiTreeVariant,
  type NuiTreeItem,
  type NuiTreeProps,
} from './tree.types';
import { useTreeNavigation } from './use-tree-navigation';
import { ListContextKind } from '../list/list.types';

interface RenderedNode {
  readonly node: TreeNode<T>;
  readonly key: string | number;
  readonly index: number;
}

const ROW_SIZES: Record<NuiSize, number> = { sm: 32, md: 36, lg: 40 };

const lengthOf = (value: string): number => Number.parseFloat(value) || 0;

const afterPaint = (callback: () => void): void => {
  if (typeof requestAnimationFrame === 'undefined') {
    callback();
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(callback));
};

const ariaChecked = (state: CheckState | undefined): boolean | 'mixed' =>
  state === CheckState.Indeterminate ? AriaValue.Mixed : state === CheckState.Checked;

const FOLDING = {
  tag: 'ul',
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
  variant = NuiTreeVariant.Plain,
  size = NuiSize.Md,
  selectable = undefined,
  checkable = false,
  icons = true,
  virtual = false,
  height,
  itemHeight,
  loop = false,
  typeahead = true,
  loading = false,
  loadingLabel,
  emptyLabel,
  label,
  labelledBy,
} = defineProps<NuiTreeProps<T>>();

const model = defineModel<T | null>({ default: null });
const values = defineModel<T[]>('values', { default: () => [] });
const expanded = defineModel<T[]>('expanded', { default: () => [] });

const emit = defineEmits<{
  expand: [item: NuiTreeItem<T>];
  collapse: [item: NuiTreeItem<T>];
  load: [item: NuiTreeItem<T>];
  select: [item: NuiTreeItem<T>];
}>();

const baseId = useControlId(() => id);
const root = useTemplateRef<HTMLElement>('root');
const messages = useMessages(listMessages);
const mounted = ref(false);
const focused = ref(false);
const pointerModality = ref(false);
const rowScale = ref(1);
const framePadding = ref(0);

const mode = computed(() => {
  if (checkable) {
    return 'multiple';
  }
  return selectable === undefined ? 'single' : selectable;
});

const loadingText = computed(() => loadingLabel ?? messages.value.loading);
const emptyText = computed(() => emptyLabel ?? messages.value.empty);
const isEmpty = computed(() => items.length === 0);
const widget = computed(() => loading || !isEmpty.value);

const { keyOf, selectedKeys, choose } = useOptionSelection<T>({
  options: () => [],
  model,
  values,
  multiple: () => mode.value === NuiTreeSelectable.Multiple,
  getKey: () => getKey,
});

const expandedKeys = computed(() => new Set(expanded.value.map(keyOf)));

const checkStates = computed(() =>
  checkable ? checkStatesOf(items, selectedKeys.value, keyOf) : new Map<string, CheckState>(),
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

const activeNodeId = computed(() => {
  const node = visible.value[activeIndex.value];
  return node ? nodeId(node.key) : undefined;
});

const activeDescendant = computed(() => (mounted.value ? activeNodeId.value : undefined));
const rowSize = computed(() => itemHeight ?? ROW_SIZES[size] * rowScale.value);

const windowing = useVirtualList(root, {
  count: () => visible.value.length,
  itemSize: () => rowSize.value,
  enabled: () => virtual,
  pinned: () => (activeIndex.value >= 0 ? activeIndex.value : undefined),
  inset: () => framePadding.value,
});

const windowFrame = useVirtualFrame(root, () => (virtual ? windowing.frame.value : undefined));

const rendered = computed<RenderedNode[]>(() =>
  virtual
    ? windowing.items.value.flatMap(({ index, slot }) => {
        const node = visible.value[index];
        return node ? [{ node, key: slot, index }] : [];
      })
    : visible.value.map((node, index) => ({ node, key: node.key, index })),
);

const rootStyle = computed(() => ({
  '--_height': height,
  ...(itemHeight === undefined ? {} : { '--_row': `${itemHeight}px` }),
  ...windowFrame.canvasStyle.value,
}));

const folderFor = (node: TreeNode<T>): boolean =>
  icons && node.item.icon === undefined && node.hasChildren;

const iconFor = (node: TreeNode<T>): IconSource | undefined => {
  if (!icons || node.item.icon === false) {
    return undefined;
  }
  if (node.item.icon) {
    return node.item.icon;
  }
  return node.hasChildren ? undefined : 'file';
};

const nodeOf = (value: T): TreeItemState | undefined => {
  const key = keyOf(value);
  const index = indexByKey.value.get(key);
  const node = index === undefined ? undefined : visible.value[index];

  if (!node) {
    return undefined;
  }

  return {
    level: node.level,
    setSize: node.setSize,
    posInSet: node.posInSet,
    expanded: node.hasChildren ? node.expanded : undefined,
    checked: checkable ? ariaChecked(checkStates.value.get(key)) : undefined,
    loading: node.loading,
  };
};

provideList<T>({
  kind: ListContextKind.Tree,
  selectable: computed(() => (mode.value === false ? undefined : mode.value)),
  variant: computed(() => variant),
  size: computed(() => size),
  activeId: computed(() =>
    focused.value && !pointerModality.value ? activeNodeId.value : undefined,
  ),
  keyOf,
  isSelected: (value) => selectedKeys.value.has(keyOf(value)),
  nodeOf,
});

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

const setChecked = (next: ReadonlySet<string>): void => {
  values.value = collectCheckedValues(items, next, keyOf);
};

const settlePending = (): void => {
  for (const key of pending) {
    const item = findTreeItem(items, key, keyOf);

    if (!item || item.children !== undefined || !expandedKeys.value.has(key)) {
      pending.delete(key);
    }
  }
};

const completeCascade = (): void => {
  if (!checkable) {
    return;
  }
  const next = completeChecked(items, selectedKeys.value, keyOf);

  if (!sameKeys(next, selectedKeys.value)) {
    setChecked(next);
  }
};

watch([() => items, expandedKeys], settlePending);
watch(() => items, completeCascade);

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

const activate = (index: number): void => {
  const node = visible.value[index];
  if (!node || node.item.disabled || mode.value === false) {
    return;
  }
  if (checkable) {
    setChecked(applyCheck(items, selectedKeys.value, node.item, keyOf));
  } else {
    choose(node.item.value);
  }
  emit('select', node.item);
};

const navigation = useTreeNavigation<T>({
  nodes: () => visible.value,
  activeIndex: () => activeIndex.value,
  rtl: isRtl,
  loop: () => loop,
  typeahead: () => typeahead,
  pageSize: () =>
    virtual ? Math.max(1, Math.floor(windowing.viewport.value / rowSize.value)) : 10,
  onExpand: expandNode,
  onCollapse: collapseNode,
  onExpandSiblings: expandSiblings,
  onActivate: activate,
  onMove: setActive,
});

const restCursor = (): void => {
  if (activeIndex.value >= 0) {
    return;
  }
  const nodes = visible.value;
  const selected = nodes.find((node) => selectedKeys.value.has(node.key) && !node.item.disabled);
  activeKey.value = (selected ?? nodes.find((node) => !node.item.disabled))?.key;
};

const onFocus = (): void => {
  focused.value = true;
  restCursor();
};

const onBlur = (): void => {
  focused.value = false;
  pointerModality.value = false;
  activeKey.value = undefined;
  navigation.reset();
};

const onKeydown = (event: KeyboardEvent): void => {
  pointerModality.value = false;
  navigation.onKeydown(event);
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
  pointerModality.value = true;
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
  } else {
    activate(index);
  }
};

const onDblclick = (event: MouseEvent): void => {
  const index = hitNode(event);
  const node = visible.value[index];
  if (node && !node.item.disabled && !partOf(event, 'toggle') && !partOf(event, 'checkbox')) {
    toggleExpand(index);
  }
};

const measureRow = (): void => {
  const row = root.value?.querySelector('.nui-list-item');
  const measured = row instanceof HTMLElement ? row.getBoundingClientRect().height : 0;

  if (measured > 0) {
    rowScale.value = measured / ROW_SIZES[size];
  }
};

const measureFrame = (): void => {
  const element = root.value;

  if (element) {
    const style = getComputedStyle(element);

    framePadding.value = lengthOf(style.paddingBlockStart) + lengthOf(style.paddingBlockEnd);
  }
};

onMounted(() => {
  mounted.value = true;
  if (itemHeight === undefined) {
    measureRow();
  }
  if (virtual) {
    measureFrame();
  }
});
</script>
