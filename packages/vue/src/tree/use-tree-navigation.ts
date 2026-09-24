import { computed, ref, type ComputedRef } from 'vue';
import {
  emptyTypeahead,
  extendTypeahead,
  isTypeaheadActive,
  listMoveFor,
  listTargetIndex,
  matchTypeahead,
  type TypeaheadState,
} from '@numior/primitives';
import { firstChildIndexOf, parentIndexOf, type TreeNode } from './flatten';

export type TreeActivationKey = 'Enter' | ' ';

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
  readonly onActivate: (index: number, key: TreeActivationKey) => void;
  readonly onMove: (index: number) => void;
}

export interface TreeNavigation {
  readonly typeaheadQuery: ComputedRef<string>;
  onKeydown(event: KeyboardEvent): void;
  reset(): void;
}

const isPrintable = (event: KeyboardEvent): boolean =>
  event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

const enabledIndices = <T>(nodes: readonly TreeNode<T>[]): number[] =>
  nodes.flatMap((node, index) => (node.item.disabled ? [] : [index]));

export const useTreeNavigation = <T>(options: TreeNavigationOptions<T>): TreeNavigation => {
  const typeahead = ref<TypeaheadState>(emptyTypeahead);

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
    const enabled = enabledIndices(options.nodes());
    if (enabled.length === 0) {
      return true;
    }
    const position = enabled.indexOf(options.activeIndex());
    const target = listTargetIndex(
      move,
      position,
      enabled.length,
      options.loop(),
      options.pageSize(),
    );
    moveTo(enabled[target] ?? -1);
    return true;
  };

  const type = (key: string): void => {
    const enabled = enabledIndices(options.nodes());
    typeahead.value = extendTypeahead(typeahead.value, key, Date.now());
    const labels = enabled.map((index) => options.nodes()[index]?.item.label ?? '');
    const found = matchTypeahead(
      labels,
      typeahead.value.query,
      enabled.indexOf(options.activeIndex()),
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
      options.onActivate(options.activeIndex(), 'Enter');
      return true;
    }
    if (event.key === ' ' && !isTypeaheadActive(typeahead.value, Date.now())) {
      options.onActivate(options.activeIndex(), ' ');
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
