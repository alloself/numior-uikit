import {
  childNode,
  containerSlot,
  holdsSlots,
  isSlot,
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
import { computed, ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue';

export interface BlockHandleOptions {
  readonly frame: Readonly<Ref<HTMLElement | null>>;
  readonly content: Readonly<Ref<HTMLElement | null>>;
  readonly handle: Readonly<Ref<HTMLElement | null>>;
  readonly drop: Readonly<Ref<HTMLElement | null>>;
  readonly ghost: Readonly<Ref<HTMLElement | null>>;
  readonly view: () => EditorView | undefined;
  readonly state: () => EditorState;
  readonly enabled: () => boolean;
  readonly focused: () => boolean;
  readonly run: (command: Command) => boolean;
}

export interface BlockHandle {
  readonly slot: ComputedRef<ChildSlot | undefined>;
  readonly dragging: ComputedRef<boolean>;
  readonly menuOpen: Ref<boolean>;
  readonly onPointermove: (event: PointerEvent) => void;
  readonly onPointerleave: () => void;
  readonly onGripPointerdown: (event: PointerEvent) => void;
  readonly selectContainer: () => void;
}

interface Grab {
  readonly slot: ChildSlot;
  readonly offset: number;
  readonly copy: Element | undefined;
}

const PUSHED = 'nui-editor__pushed';

const LIFTED = 'nui-editor__lifted';

const MARKS = [PUSHED, LIFTED, 'nui-editor__selected'];

const BLOCK = '.nui-editor__chunk > *';

const WIDGET = '.nui-editor__widget';

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

const paddingBox = (element: HTMLElement | null): DOMRect | undefined => {
  if (element === null) {
    return undefined;
  }
  const rect = element.getBoundingClientRect();

  return new DOMRect(
    rect.left + element.clientLeft,
    rect.top + element.clientTop,
    element.clientWidth,
    element.clientHeight,
  );
};

const marginStart = (element: Element): number =>
  Number.parseFloat(getComputedStyle(element).marginInlineStart) || 0;

const startEdge = (frame: DOMRect, element: Element, rtl: boolean): number => {
  const rect = element.getBoundingClientRect();
  const edge = rtl ? frame.right - rect.right : rect.left - frame.left;

  return edge - marginStart(element) - markerSpace(element);
};

const spans = (element: Element | undefined, clientY: number): boolean => {
  const rect = element?.getBoundingClientRect();

  return rect !== undefined && clientY >= rect.top && clientY <= rect.bottom;
};

const innerSlot = (view: EditorView, node: ElementNode, clientY: number): ChildSlot | undefined => {
  if (holdsSlots(view.state.doc, node)) {
    const index = indexAtY(view, node.id, clientY);

    return node.content.length === 0 || !isSlot(view.state.doc, node, index)
      ? undefined
      : { parent: node.id, index };
  }
  for (const child of node.content) {
    if (child.kind === 'element' && spans(view.nodeDOM(child.id), clientY)) {
      return innerSlot(view, child, clientY);
    }
  }
  return undefined;
};

const deepestSlot = (view: EditorView, slot: ChildSlot, clientY: number): ChildSlot => {
  let current = slot;

  for (
    let node = childNode(view.state.doc, current);
    node !== undefined;
    node = childNode(view.state.doc, current)
  ) {
    const inner = innerSlot(view, node, clientY);

    if (inner === undefined) {
      return current;
    }
    current = inner;
  }
  return current;
};

const unmarked = (element: Element): void => {
  for (const name of MARKS) {
    element.classList.remove(name);
    for (const inner of element.querySelectorAll(`.${name}`)) {
      inner.classList.remove(name);
    }
  }
};

const inList = (element: Element, copy: Element): Element => {
  const parent = element.parentElement;
  const list = parent?.cloneNode(false);

  if (parent === null || !(list instanceof Element) || markerSpace(element) === 0) {
    return copy;
  }
  if (parent instanceof HTMLOListElement && list instanceof HTMLOListElement) {
    list.start = parent.start + [...parent.children].indexOf(element);
  }
  list.append(copy);
  return list;
};

const ghostOf = (element: Element): Element | undefined => {
  const copy = element.cloneNode(true);

  if (!(copy instanceof Element)) {
    return undefined;
  }
  unmarked(copy);
  return inList(element, copy);
};

export const useBlockHandle = (options: BlockHandleOptions): BlockHandle => {
  const hovered = shallowRef<ChildSlot | undefined>();
  const menuOpen = ref(false);
  const coarse = useMediaQuery('(pointer: coarse)');
  let grab: Grab | undefined;
  let pushed: Element | undefined;
  let lifted: Element | undefined;
  let pin: { armed: boolean } | undefined;
  let ghostHeight = 0;

  const rtl = (): boolean =>
    options.frame.value !== null && getComputedStyle(options.frame.value).direction === 'rtl';

  const push = (element: Element | undefined): void => {
    if (element !== pushed || element?.classList.contains(PUSHED) === false) {
      pushed?.classList.remove(PUSHED);
      element?.classList.add(PUSHED);
      pushed = element;
    }
  };

  const lift = (element: Element | undefined): void => {
    if (element !== lifted) {
      lifted?.classList.remove(LIFTED);
      element?.classList.add(LIFTED);
      lifted = element;
    }
  };

  const place = (
    target: HTMLElement | null,
    element: Element | undefined,
    edge: 'top' | 'bottom',
  ): void => {
    const frame = paddingBox(options.frame.value);
    const rect = element?.getBoundingClientRect();

    if (target === null || frame === undefined || rect === undefined) {
      return;
    }
    target.style.top = `${String((edge === 'top' ? rect.top : rect.bottom) - frame.top)}px`;
    target.style.insetInlineStart = `${String(startEdge(frame, element ?? target, rtl()))}px`;
  };

  const follow = (state: ReorderState): void => {
    const view = options.view();
    const frame = paddingBox(options.frame.value);
    const dragging = state.phase === 'dragging' ? state : undefined;
    const ghost = options.ghost.value;

    if (dragging === undefined || view === undefined || grab === undefined || frame === undefined) {
      lift(undefined);
      options.drop.value?.style.removeProperty('top');
      return;
    }
    const target = elementOf(view, { parent: grab.slot.parent, index: dragging.to });

    lift(elementOf(view, { parent: grab.slot.parent, index: dragging.from }));

    place(options.drop.value, target, dragging.to > dragging.from ? 'bottom' : 'top');
    if (ghost !== null && ghost.firstChild !== (grab.copy ?? null)) {
      ghost.replaceChildren(...(grab.copy === undefined ? [] : [grab.copy]));
      ghostHeight = ghost.offsetHeight;
    }

    const top = Math.min(
      Math.max(0, dragging.position - frame.top - grab.offset),
      Math.max(0, frame.height - ghostHeight),
    );

    ghost?.style.setProperty('--_ghost-top', `${String(top)}px`);
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
    () => options.state(),
    (state, previous) => {
      const lost = hovered.value !== undefined && childNode(state.doc, hovered.value) === undefined;
      const moved = coarse.value && state.selection !== previous.selection;

      if (lost || moved) {
        hovered.value = undefined;
        pin = undefined;
      }
    },
  );

  watch(
    [slot, () => options.state().doc],
    ([value]) => {
      const view = options.view();
      const element = view === undefined ? undefined : elementOf(view, value);

      place(options.handle.value, element, 'top');
      push(element);
    },
    { flush: 'post' },
  );

  const held = (view: EditorView, target: Element): boolean => {
    if (pin === undefined) {
      return false;
    }
    if (elementOf(view, hovered.value)?.contains(target) === true) {
      pin.armed = true;
      return true;
    }
    if (pin.armed) {
      pin = undefined;
      return false;
    }
    return true;
  };

  const nearStart = (
    event: PointerEvent,
    view: EditorView,
    next: ChildSlot | undefined,
  ): boolean => {
    const rect = elementOf(view, next)?.getBoundingClientRect();

    if (rect === undefined) {
      return false;
    }
    return (rtl() ? rect.right - event.clientX : event.clientX - rect.left) <= ZONE;
  };

  const release = (): void => {
    if (!menuOpen.value && !dragging.value && pin?.armed !== false) {
      hovered.value = undefined;
      pin = undefined;
    }
  };

  const outside = (target: Element): boolean =>
    options.content.value?.contains(target) !== true &&
    options.handle.value?.contains(target) !== true;

  const onPointermove = (event: PointerEvent): void => {
    const view = options.view();
    const target = event.target;

    if (target instanceof Element && outside(target)) {
      release();
      return;
    }
    if (
      view === undefined ||
      !(target instanceof Element) ||
      target.closest(BLOCK) === null ||
      target.closest(WIDGET) !== null ||
      options.content.value?.contains(target) !== true ||
      menuOpen.value ||
      dragging.value ||
      held(view, target)
    ) {
      return;
    }
    const found = slotAt(view.state.doc, view.posAtDOM(target, 0));
    const next = found === undefined ? undefined : deepestSlot(view, found, event.clientY);

    if (!sameSlot(next, hovered.value)) {
      hovered.value = nearStart(event, view, next) ? next : undefined;
    }
  };

  const onGripPointerdown = (event: PointerEvent): void => {
    const view = options.view();
    const current = slot.value;
    const element = view === undefined ? undefined : elementOf(view, current);
    const frame = paddingBox(options.frame.value);
    const rect = element?.getBoundingClientRect();

    if (
      current === undefined ||
      element === undefined ||
      rect === undefined ||
      frame === undefined
    ) {
      return;
    }
    const width = rect.width + marginStart(element) + markerSpace(element);

    grab = { slot: current, offset: event.clientY - rect.top, copy: ghostOf(element) };

    options.ghost.value?.style.setProperty(
      '--_ghost-start',
      `${String(startEdge(frame, element, rtl()))}px`,
    );

    options.ghost.value?.style.setProperty('--_ghost-width', `${String(width)}px`);
    reorder.onPointerdown(current.index, event);
  };

  return {
    slot,
    dragging,
    menuOpen,
    onPointermove,
    onPointerleave: release,
    onGripPointerdown,
    selectContainer: () => {
      const outer =
        slot.value === undefined ? undefined : containerSlot(options.state().doc, slot.value);

      if (outer !== undefined) {
        hovered.value = outer;
        pin = { armed: false };
      }
    },
  };
};
