import { computed, ref, type ComputedRef } from 'vue';
import {
  emptyTypeahead,
  extendTypeahead,
  isTypeaheadActive,
  listMoveFor,
  lowerLabels,
  matchTypeahead,
  type ListMove,
  type TypeaheadState,
} from '@numior/primitives';
import { firstChildIndexOf, parentIndexOf, type TreeNode } from './flatten';

export interface TreeNavigationOptions<T> {
  readonly nodes: () => readonly TreeNode<T>[];
  readonly activeIndex: () => number;
  readonly rtl: () => boolean;
  readonly loop: () => boolean;
  readonly typeahead: () => boolean;
  readonly pageSize: () => number;
  readonly onExpand: (index: number) => void;
  readonly onCollapse: (index: number) => void;
  readonly onExpandSiblings: (index: number) => void;
  readonly onActivate: (index: number) => void;
  readonly onMove: (index: number) => void;
}

export interface TreeNavigation {
  readonly typeaheadQuery: ComputedRef<string>;
  onKeydown(event: KeyboardEvent): void;
  reset(): void;
}

const isPrintable = (event: KeyboardEvent): boolean =>
  event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

interface TypeaheadIndex {
  readonly enabled: readonly number[];
  readonly slots: ReadonlyMap<number, number>;
  readonly lowered: readonly string[];
}

const enabledIndices = <T>(nodes: readonly TreeNode<T>[]): number[] =>
  nodes.flatMap((node, index) => (node.item.disabled ? [] : [index]));

const typeaheadIndexOf = <T>(nodes: readonly TreeNode<T>[]): TypeaheadIndex => {
  const enabled = enabledIndices(nodes);

  return {
    enabled,
    slots: new Map(enabled.map((node, slot) => [node, slot] as const)),
    lowered: lowerLabels(enabled.map((node) => nodes[node]?.item.label ?? '')),
  };
};

const isEnabled = <T>(nodes: readonly TreeNode<T>[], index: number): boolean => {
  const node = nodes[index];
  return node !== undefined && !node.item.disabled;
};

const walk = <T>(
  nodes: readonly TreeNode<T>[],
  from: number,
  direction: 1 | -1,
  count: number,
): number => {
  let found = -1;
  let seen = 0;

  for (let index = from; index >= 0 && index < nodes.length && seen < count; index += direction) {
    if (isEnabled(nodes, index)) {
      found = index;
      seen += 1;
    }
  }
  return found;
};

interface Cursor<T> {
  readonly nodes: readonly TreeNode<T>[];
  readonly current: number;
  readonly loop: boolean;
  readonly page: number;
}

const firstOf = <T>(nodes: readonly TreeNode<T>[]): number => walk(nodes, 0, 1, 1);

const lastOf = <T>(nodes: readonly TreeNode<T>[]): number => walk(nodes, nodes.length - 1, -1, 1);

const stepFrom = <T>({ nodes, current, loop }: Cursor<T>, direction: 1 | -1): number => {
  const edge = direction === 1 ? firstOf(nodes) : lastOf(nodes);

  if (current < 0) {
    return edge;
  }

  const next = walk(nodes, current + direction, direction, 1);

  if (next >= 0) {
    return next;
  }
  return loop ? edge : current;
};

const MOVES: Readonly<Record<ListMove, <T>(cursor: Cursor<T>) => number>> = {
  first: ({ nodes }) => firstOf(nodes),
  last: ({ nodes }) => lastOf(nodes),
  next: (cursor) => stepFrom(cursor, 1),
  prev: (cursor) => stepFrom(cursor, -1),
  'page-next': ({ nodes, current, page }) => walk(nodes, Math.max(0, current), 1, page + 1),
  'page-prev': ({ nodes, current, page }) =>
    current < 0 ? firstOf(nodes) : walk(nodes, current, -1, page + 1),
};

export const useTreeNavigation = <T>(options: TreeNavigationOptions<T>): TreeNavigation => {
  const typeahead = ref<TypeaheadState>(emptyTypeahead);
  const typeaheadIndex = computed(() => typeaheadIndexOf(options.nodes()));

  const moveTo = (index: number): void => {
    if (index >= 0) {
      options.onMove(index);
    }
  };

  const stepInto = (): void => {
    const nodes = options.nodes();
    const index = options.activeIndex();
    const node = nodes[index];
    if (!node || !node.hasChildren) {
      return;
    }
    if (node.expanded) {
      moveTo(firstChildIndexOf(nodes, index));
    } else {
      options.onExpand(index);
    }
  };

  const stepOut = (): void => {
    const nodes = options.nodes();
    const index = options.activeIndex();
    const node = nodes[index];
    if (!node) {
      return;
    }
    if (node.expanded) {
      options.onCollapse(index);
      return;
    }
    const parent = parentIndexOf(nodes, index);
    if (parent >= 0 && !nodes[parent]?.item.disabled) {
      moveTo(parent);
    }
  };

  const moveBy = (key: string): boolean => {
    const move = listMoveFor(key, 'vertical', options.rtl());
    if (!move) {
      return false;
    }

    const nodes = options.nodes();
    const active = options.activeIndex();

    moveTo(
      MOVES[move]({
        nodes,
        current: isEnabled(nodes, active) ? active : -1,
        loop: options.loop(),
        page: options.pageSize(),
      }),
    );

    return true;
  };

  const type = (key: string): void => {
    const { enabled, slots, lowered } = typeaheadIndex.value;

    typeahead.value = extendTypeahead(typeahead.value, key, Date.now());

    const found = matchTypeahead(
      lowered,
      typeahead.value.query,
      slots.get(options.activeIndex()) ?? -1,
    );

    if (found >= 0) {
      moveTo(enabled[found] ?? -1);
    }
  };

  const horizontal = (key: string): boolean => {
    const forward = options.rtl() ? 'ArrowLeft' : 'ArrowRight';
    const backward = options.rtl() ? 'ArrowRight' : 'ArrowLeft';
    if (key === forward) {
      stepInto();
      return true;
    }
    if (key === backward) {
      stepOut();
      return true;
    }
    return false;
  };

  const handle = (event: KeyboardEvent): boolean => {
    if (moveBy(event.key) || horizontal(event.key)) {
      return true;
    }
    if (event.key === '*') {
      options.onExpandSiblings(options.activeIndex());
      return true;
    }
    if (event.key === 'Enter') {
      options.onActivate(options.activeIndex());
      return true;
    }
    if (event.key === ' ' && !isTypeaheadActive(typeahead.value, Date.now())) {
      options.onActivate(options.activeIndex());
      return true;
    }
    if (options.typeahead() && isPrintable(event)) {
      type(event.key);
      return true;
    }
    return false;
  };

  return {
    typeaheadQuery: computed(() => typeahead.value.query),
    onKeydown: (event) => {
      if (!event.defaultPrevented && handle(event)) {
        event.preventDefault();
      }
    },
    reset: () => {
      typeahead.value = emptyTypeahead;
    },
  };
};
