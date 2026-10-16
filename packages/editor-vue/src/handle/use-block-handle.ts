import {
  childNode,
  containerSlot,
  selectionSlot,
  slotAt,
  type ChildSlot,
  type Command,
  type EditorState,
} from '@numior/editor-core';
import type { EditorView } from '@numior/editor-core/view';
import { useMediaQuery } from '@vueuse/core';
import { computed, ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue';
import {
  BLOCK,
  deepestSlot,
  elementOf,
  paddingBox,
  sameSlot,
  startEdge,
  WIDGET,
} from './block-geometry';
import { useBlockDrag } from './use-block-drag';

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
  readonly aiming: ComputedRef<boolean>;
  readonly aimingSide: ComputedRef<boolean>;
  readonly menuOpen: Ref<boolean>;
  readonly onPointermove: (event: PointerEvent) => void;
  readonly onPointerleave: () => void;
  readonly onGripPointerdown: (event: PointerEvent) => void;
  readonly selectContainer: () => void;
}

const PUSHED = 'nui-editor__pushed';

const ZONE = 48;

export const useBlockHandle = (options: BlockHandleOptions): BlockHandle => {
  const hovered = shallowRef<ChildSlot | undefined>();
  const menuOpen = ref(false);
  const coarse = useMediaQuery('(pointer: coarse)');
  let pushed: Element | undefined;
  let pin: { armed: boolean } | undefined;

  const rtl = (): boolean =>
    options.frame.value !== null && getComputedStyle(options.frame.value).direction === 'rtl';

  const push = (element: Element | undefined): void => {
    if (element !== pushed || element?.classList.contains(PUSHED) === false) {
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
    const frame = paddingBox(options.frame.value);
    const rect = element?.getBoundingClientRect();

    if (target === null || frame === undefined || rect === undefined) {
      return;
    }
    target.style.top = `${String((edge === 'top' ? rect.top : rect.bottom) - frame.top)}px`;
    target.style.insetInlineStart = `${String(startEdge(frame, element ?? target, rtl()))}px`;
  };

  const drag = useBlockDrag({
    frame: options.frame,
    content: options.content,
    drop: options.drop,
    ghost: options.ghost,
    view: options.view,
    run: options.run,
    rtl,
    onDone: () => {
      hovered.value = undefined;
    },
  });

  const dragging = drag.dragging;

  const slot = computed(() => {
    if (!options.enabled()) {
      return undefined;
    }
    const caret = coarse.value && options.focused() ? selectionSlot(options.state()) : undefined;

    return drag.source.value ?? hovered.value ?? caret;
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

    if (current !== undefined && element !== undefined) {
      drag.start(current, element, event);
    }
  };

  return {
    slot,
    dragging,
    aiming: drag.aiming,
    aimingSide: drag.aimingSide,
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
