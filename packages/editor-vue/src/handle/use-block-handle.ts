import {
  childNode,
  moveChild,
  selectionSlot,
  slotAt,
  type ChildSlot,
  type Command,
  type EditorState,
  type ElementNode,
} from '@numior/editor-core';
import type { EditorView } from '@numior/editor-core/view';
import { useReorder, type ReorderState } from '@numior/primitives';
import { useMediaQuery } from '@vueuse/core';
import { computed, ref, shallowRef, watch, type ComputedRef, type Ref, type ShallowRef } from 'vue';

export interface BlockHandleOptions {
  readonly frame: Readonly<Ref<HTMLElement | null>>;
  readonly content: Readonly<Ref<HTMLElement | null>>;
  readonly handle: Readonly<Ref<HTMLElement | null>>;
  readonly drop: Readonly<Ref<HTMLElement | null>>;
  readonly view: () => EditorView | undefined;
  readonly state: () => EditorState;
  readonly enabled: () => boolean;
  readonly focused: () => boolean;
  readonly run: (command: Command) => boolean;
}

export interface BlockGhost {
  readonly label: string;
  readonly top: number;
  readonly start: number;
}

export interface BlockHandle {
  readonly slot: ComputedRef<ChildSlot | undefined>;
  readonly dragging: ComputedRef<boolean>;
  readonly ghost: ShallowRef<BlockGhost | undefined>;
  readonly menuOpen: Ref<boolean>;
  readonly onPointermove: (event: PointerEvent) => void;
  readonly onPointerleave: () => void;
  readonly onGripPointerdown: (event: PointerEvent) => void;
}

interface Grab {
  readonly slot: ChildSlot;
  readonly offset: number;
  readonly label: string;
  readonly start: number;
}

const PUSHED = 'nui-editor__pushed';

const BLOCK = '.nui-editor__chunk > *';

const LABEL = 80;

const ZONE = 48;

const parentNode = (state: EditorState, id: string): ElementNode | undefined =>
  id === state.doc.root.id ? state.doc.root : state.doc.byId(id);

const elementOf = (view: EditorView, slot: ChildSlot | undefined): Element | undefined => {
  const node = slot === undefined ? undefined : childNode(view.state.doc, slot);

  return node === undefined ? undefined : view.nodeDOM(node.id);
};

const sameSlot = (left: ChildSlot | undefined, right: ChildSlot | undefined): boolean =>
  left?.parent === right?.parent && left?.index === right?.index;

const indexAtY = (view: EditorView, parent: string, clientY: number): number => {
  const count = parentNode(view.state, parent)?.content.length ?? 0;
  let low = 0;
  let high = count - 1;

  while (low < high) {
    const middle = (low + high) >> 1;
    const rect = elementOf(view, { parent, index: middle })?.getBoundingClientRect();

    if (rect !== undefined && clientY > rect.bottom) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return Math.max(0, low);
};

const markerSpace = (element: Element): number => {
  const parent = element.parentElement;

  return parent === null || getComputedStyle(element).display !== 'list-item'
    ? 0
    : Number.parseFloat(getComputedStyle(parent).paddingInlineStart) || 0;
};

const startEdge = (frame: DOMRect, element: Element, rtl: boolean): number => {
  const rect = element.getBoundingClientRect();
  const edge = rtl ? frame.right - rect.right : rect.left - frame.left;

  return edge - markerSpace(element);
};

export const useBlockHandle = (options: BlockHandleOptions): BlockHandle => {
  const hovered = shallowRef<ChildSlot | undefined>();
  const ghost = shallowRef<BlockGhost | undefined>();
  const menuOpen = ref(false);
  const coarse = useMediaQuery('(pointer: coarse)');
  let grab: Grab | undefined;
  let pushed: Element | undefined;

  const rtl = (): boolean =>
    options.frame.value !== null && getComputedStyle(options.frame.value).direction === 'rtl';

  const push = (element: Element | undefined): void => {
    if (element !== pushed) {
      pushed?.classList.remove(PUSHED);
      element?.classList.add(PUSHED);
      pushed = element;
    }
  };

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
    target.style.insetInlineStart = `${String(startEdge(frame, element ?? target, rtl()))}px`;
  };

  const follow = (state: ReorderState): void => {
    const view = options.view();
    const frame = options.frame.value?.getBoundingClientRect();
    const dragging = state.phase === 'dragging' ? state : undefined;

    if (dragging === undefined || view === undefined || grab === undefined || frame === undefined) {
      ghost.value = undefined;
      options.drop.value?.style.removeProperty('top');
      return;
    }
    const target = elementOf(view, { parent: grab.slot.parent, index: dragging.to });

    place(options.drop.value, target, dragging.to > dragging.from ? 'bottom' : 'top');

    ghost.value = {
      label: grab.label,
      top: Math.min(Math.max(0, dragging.position - frame.top - grab.offset), frame.height),
      start: grab.start,
    };
  };

  const reorder = useReorder({
    axis: 'y',
    count: () => {
      const parent = grab === undefined ? undefined : parentNode(options.state(), grab.slot.parent);

      return parent?.content.length ?? 0;
    },
    container: options.frame,
    indexAt: (client) => {
      const view = options.view();

      return view === undefined || grab === undefined
        ? 0
        : indexAtY(view, grab.slot.parent, client);
    },
    onMove: (from, to) => {
      if (grab !== undefined) {
        options.run(moveChild(grab.slot.parent, from, to));
      }
      hovered.value = undefined;
    },
    onChange: follow,
  });

  const dragging = computed(() => reorder.state.value.phase === 'dragging');

  const slot = computed(() => {
    if (!options.enabled()) {
      return undefined;
    }
    const caret = coarse.value && options.focused() ? selectionSlot(options.state()) : undefined;
    const source = reorder.source.value;

    return source !== undefined && grab !== undefined
      ? { parent: grab.slot.parent, index: source }
      : (hovered.value ?? caret);
  });

  watch(
    slot,
    (value, previous) => {
      const view = options.view();

      if (sameSlot(value, previous) && value !== undefined) {
        return;
      }
      const element = view === undefined ? undefined : elementOf(view, value);

      place(options.handle.value, element, 'top');
      push(element);
    },
    { flush: 'post' },
  );

  const nearStart = (
    event: PointerEvent,
    view: EditorView,
    next: ChildSlot | undefined,
  ): boolean => {
    const element = elementOf(view, next);
    const rect = element?.getBoundingClientRect();

    if (element === undefined || rect === undefined) {
      return false;
    }
    const space = markerSpace(element);
    const offset = rtl() ? rect.right + space - event.clientX : event.clientX - rect.left + space;

    return offset <= ZONE + space;
  };

  const onPointermove = (event: PointerEvent): void => {
    const view = options.view();
    const target = event.target;

    if (
      view === undefined ||
      !(target instanceof Element) ||
      target.closest(BLOCK) === null ||
      options.content.value?.contains(target) !== true ||
      menuOpen.value ||
      dragging.value
    ) {
      return;
    }
    const next = slotAt(view.state.doc, view.posAtDOM(target, 0));

    if (!sameSlot(next, hovered.value)) {
      hovered.value = nearStart(event, view, next) ? next : undefined;
    }
  };

  const onGripPointerdown = (event: PointerEvent): void => {
    const view = options.view();
    const current = slot.value;
    const element = view === undefined ? undefined : elementOf(view, current);
    const frame = options.frame.value?.getBoundingClientRect();
    const rect = element?.getBoundingClientRect();

    if (current === undefined || rect === undefined || frame === undefined) {
      return;
    }

    grab = {
      slot: current,
      offset: event.clientY - rect.top,
      label: (element?.textContent ?? '').trim().slice(0, LABEL),
      start: element === undefined ? 0 : startEdge(frame, element, rtl()),
    };

    reorder.onPointerdown(current.index, event);
  };

  return {
    slot,
    dragging,
    ghost,
    menuOpen,
    onPointermove,
    onPointerleave: () => {
      if (!menuOpen.value && !dragging.value) {
        hovered.value = undefined;
      }
    },
    onGripPointerdown,
  };
};
