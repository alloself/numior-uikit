import { blockIndex, moveBlock, type Command, type EditorState } from '@numior/editor-core';
import type { EditorView } from '@numior/editor-core/view';
import { useReorder, type ReorderState } from '@numior/primitives';
import { useMediaQuery } from '@vueuse/core';
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';

export interface BlockHandleOptions {
  readonly frame: Readonly<Ref<HTMLElement | null>>;
  readonly handle: Readonly<Ref<HTMLElement | null>>;
  readonly drop: Readonly<Ref<HTMLElement | null>>;
  readonly view: () => EditorView | undefined;
  readonly state: () => EditorState;
  readonly enabled: () => boolean;
  readonly focused: () => boolean;
  readonly run: (command: Command) => boolean;
}

export interface BlockHandle {
  readonly index: ComputedRef<number | undefined>;
  readonly dragging: ComputedRef<boolean>;
  readonly menuOpen: Ref<boolean>;
  readonly onPointermove: (event: PointerEvent) => void;
  readonly onPointerleave: () => void;
  readonly onGripPointerdown: (event: PointerEvent) => void;
}

const BLOCK = '.nui-editor__chunk > *';

const blockElement = (view: EditorView, state: EditorState, index: number): Element | undefined => {
  const node = state.doc.root.content[index];

  return node?.kind === 'element' ? view.nodeDOM(node.id) : undefined;
};

const indexOfElement = (view: EditorView, element: Element): number | undefined => {
  const pos = view.posAtDOM(element, 0);
  const $pos = view.state.doc.resolve(pos);

  return $pos.depth >= 1 ? $pos.indexAt(0) : $pos.index;
};

const indexAtY = (view: EditorView, clientY: number): number => {
  const { state } = view;
  let low = 0;
  let high = state.doc.root.content.length - 1;

  while (low < high) {
    const middle = (low + high) >> 1;
    const rect = blockElement(view, state, middle)?.getBoundingClientRect();

    if (rect !== undefined && clientY > rect.bottom) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
};

export const useBlockHandle = (options: BlockHandleOptions): BlockHandle => {
  const hovered = ref<number | undefined>();
  const menuOpen = ref(false);
  const coarse = useMediaQuery('(pointer: coarse)');

  const place = (
    target: HTMLElement | null,
    element: Element | undefined,
    edge: 'top' | 'bottom',
  ): void => {
    const frame = options.frame.value?.getBoundingClientRect();
    const rect = element?.getBoundingClientRect();

    if (target === null || frame === undefined || rect === undefined) {
      return;
    }
    target.style.top = `${String((edge === 'top' ? rect.top : rect.bottom) - frame.top)}px`;
  };

  const showDrop = (state: ReorderState): void => {
    const view = options.view();
    const drop = options.drop.value;
    const target = state.phase === 'dragging' && view !== undefined ? state : undefined;

    if (target === undefined || view === undefined) {
      drop?.style.removeProperty('top');
      return;
    }

    place(
      drop,
      blockElement(view, view.state, target.to),
      target.to > target.from ? 'bottom' : 'top',
    );
  };

  const reorder = useReorder({
    axis: 'y',
    count: () => options.state().doc.root.content.length,
    container: options.frame,
    indexAt: (client) => {
      const view = options.view();

      return view === undefined ? 0 : indexAtY(view, client);
    },
    onMove: (from, to) => {
      options.run(moveBlock(from, to));
      hovered.value = undefined;
    },
    onChange: showDrop,
  });

  const dragging = computed(() => reorder.state.value.phase === 'dragging');

  const index = computed(() => {
    if (!options.enabled()) {
      return undefined;
    }
    const caret = coarse.value && options.focused() ? blockIndex(options.state()) : undefined;

    return reorder.source.value ?? hovered.value ?? caret;
  });

  watch(
    index,
    (value) => {
      const view = options.view();

      if (value !== undefined && view !== undefined) {
        place(options.handle.value, blockElement(view, view.state, value), 'top');
      }
    },
    { flush: 'post' },
  );

  const onPointermove = (event: PointerEvent): void => {
    const view = options.view();
    const target = event.target instanceof Element ? event.target.closest(BLOCK) : null;

    if (view === undefined || target === null || menuOpen.value || dragging.value) {
      return;
    }
    hovered.value = indexOfElement(view, target);
    place(options.handle.value, target, 'top');
  };

  return {
    index,
    dragging,
    menuOpen,
    onPointermove,
    onPointerleave: () => {
      if (!menuOpen.value && !dragging.value) {
        hovered.value = undefined;
      }
    },
    onGripPointerdown: (event) => {
      const current = index.value;

      if (current !== undefined) {
        reorder.onPointerdown(current, event);
      }
    },
  };
};
