import {
  childNode,
  containerSlot,
  ContentNodeKind,
  SelectionKind,
  selectionSlot,
  slotAt,
  type ChildSlot,
  type Command,
  type EditorState,
  type ElementNode,
} from '@numior/editor-core';
import type { EditorView } from '@numior/editor-core/view';
import { computed, onScopeDispose, ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue';
import {
  BLOCK,
  deepestSlot,
  elementOf,
  lineStart,
  paddingBox,
  sameSlot,
  startEdge,
  WIDGET,
} from './block-geometry';
import { NuiEditorHandlePlacement } from '../blocks/block.types';
import { useBlockDrag } from './use-block-drag';
import { AriaValue, Direction, PointerType, useMediaQuery } from '@numior/primitives';

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
  readonly layerOpen: () => boolean;
  readonly run: (command: Command) => boolean;
  readonly placement: (node: ElementNode) => NuiEditorHandlePlacement;
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

const BESIDE_GAP = 'var(--nui-space-2)';

const CONTROL = 'button, input, select, textarea, a, label, [role], [tabindex]';

const widgetBlock = (target: Element): Element | undefined => {
  const widget = target.closest(WIDGET);
  const owner = widget?.parentElement ?? undefined;
  const control = target.closest(CONTROL);
  const atom = owner?.getAttribute('contenteditable') === AriaValue.False;

  return !atom && control !== null && widget?.contains(control) === true ? undefined : owner;
};

const atomStart = (element: Element | undefined): number | undefined =>
  element instanceof HTMLElement && element.getAttribute('contenteditable') === AriaValue.False
    ? element.getBoundingClientRect().left
    : undefined;

const leadOf = (element: Element): Element =>
  element.matches(':has(> .nui-editor__widget)') ? element : (element.firstElementChild ?? element);

const glide = (element: Element | undefined, before: number | undefined): void => {
  const shift =
    element instanceof HTMLElement && before !== undefined
      ? before - element.getBoundingClientRect().left
      : 0;

  if (!(element instanceof HTMLElement) || shift === 0 || typeof element.animate !== 'function') {
    return;
  }
  const style = getComputedStyle(element);

  element.animate([{ translate: `${String(shift)}px 0` }, { translate: '0 0' }], {
    duration: Number.parseFloat(style.getPropertyValue('--nui-duration-fast')) || 0,
    easing: style.getPropertyValue('--nui-easing').trim() || 'ease',
  });
};

const hoverPoint = (target: Element): Element | undefined => {
  if (target.closest(BLOCK) === null) {
    return undefined;
  }
  return target.closest(WIDGET) === null ? target : widgetBlock(target);
};

export const useBlockHandle = (options: BlockHandleOptions): BlockHandle => {
  const hovered = shallowRef<ChildSlot | undefined>();
  const kept = shallowRef<{ readonly slot: ChildSlot | undefined }>();
  const menuOpen = ref(false);
  const coarse = useMediaQuery('(pointer: coarse)');
  let pushed: Element | undefined;
  let pin: { armed: boolean } | undefined;

  const rtl = (): boolean =>
    options.frame.value !== null &&
    getComputedStyle(options.frame.value).direction === Direction.Rtl;

  const besideOf = (slot: ChildSlot | undefined): boolean => {
    const node = slot === undefined ? undefined : childNode(options.state().doc, slot);

    return (
      node?.kind === ContentNodeKind.Element &&
      options.placement(node) === NuiEditorHandlePlacement.Beside
    );
  };

  const placeBeside = (target: HTMLElement, element: Element, frame: DOMRect): boolean => {
    const rect = leadOf(element).getBoundingClientRect();
    const end = rtl() ? rect.right - frame.left : frame.right - rect.left;

    target.style.insetInlineStart = 'auto';
    target.style.insetInlineEnd = `${String(end)}px`;
    target.style.marginInlineEnd = BESIDE_GAP;

    const placed = target.getBoundingClientRect();
    const start = rtl() ? frame.right - placed.right : placed.left - frame.left;

    return start >= lineStart(frame, element, rtl()) - 1;
  };

  const placeAtStart = (target: HTMLElement, element: Element, frame: DOMRect): void => {
    target.style.insetInlineEnd = 'auto';
    target.style.marginInlineEnd = '';
    target.style.insetInlineStart = `${String(startEdge(frame, element, rtl()))}px`;
  };

  const push = (element: Element | undefined): void => {
    const settled = element === pushed && element?.classList.contains(PUSHED) !== false;

    if (settled) {
      return;
    }

    const before = pushed;
    const leaving = atomStart(before);
    const coming = atomStart(element);

    before?.classList.remove(PUSHED);
    element?.classList.add(PUSHED);
    pushed = element;
    glide(before, leaving);
    glide(element, coming);
  };

  const place = (element: Element | undefined, beside: boolean): void => {
    const target = options.handle.value;
    const frame = paddingBox(options.frame.value);

    if (target === null || frame === undefined || element === undefined) {
      push(undefined);
      return;
    }
    target.style.top = `${String(element.getBoundingClientRect().top - frame.top)}px`;

    const wasPushed = beside && element.classList.contains(PUSHED);

    if (wasPushed) {
      element.classList.remove(PUSHED);
    }

    const apart = beside && placeBeside(target, element, frame);

    if (!apart) {
      if (wasPushed) {
        element.classList.add(PUSHED);
      }
      placeAtStart(target, element, frame);
    }
    push(apart ? undefined : element);
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

  const free = computed(() => {
    const state = options.state();

    const caret =
      coarse.value && options.focused() && state.selection.kind !== SelectionKind.Gap
        ? selectionSlot(state)
        : undefined;

    return hovered.value ?? caret;
  });

  const slot = computed(() => {
    if (!options.enabled()) {
      return undefined;
    }
    if (drag.source.value !== undefined || kept.value === undefined) {
      return drag.source.value ?? free.value;
    }
    const still = kept.value.slot;

    return still !== undefined && childNode(options.state().doc, still) !== undefined
      ? still
      : undefined;
  });

  watch(
    () => options.layerOpen(),
    (open) => {
      kept.value = open ? { slot: free.value } : undefined;
    },
  );

  watch(
    () => options.state(),
    (state, previous) => {
      const lost = hovered.value !== undefined && childNode(state.doc, hovered.value) === undefined;
      const moved = coarse.value && state.selection !== previous.selection;

      if (!lost && !moved) {
        return;
      }

      hovered.value = undefined;
      pin = undefined;
    },
  );

  let measured: Element | undefined;
  let measuredBeside = false;

  const sizes =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          place(measured, measuredBeside);
        })
      : undefined;

  const measure = (element: Element | undefined, beside: boolean): void => {
    measuredBeside = beside;
    if (element === measured) {
      return;
    }

    if (measured !== undefined) {
      sizes?.unobserve(measured);
    }
    if (element !== undefined) {
      sizes?.observe(element);
    }
    measured = element;
  };

  onScopeDispose(() => {
    sizes?.disconnect();
  });

  watch(
    [slot, () => options.state().doc],
    ([value]) => {
      const view = options.view();
      const element = view === undefined ? undefined : elementOf(view, value);

      measure(element, besideOf(value));
      place(element, besideOf(value));
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
    if (!pin.armed) {
      return true;
    }

    pin = undefined;
    return false;
  };

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
    return (
      besideOf(next) || (rtl() ? rect.right - event.clientX : event.clientX - rect.left) <= ZONE
    );
  };

  const release = (): void => {
    if (menuOpen.value || dragging.value || pin?.armed === false) {
      return;
    }

    hovered.value = undefined;
    pin = undefined;
  };

  const outside = (target: Element): boolean =>
    options.content.value?.contains(target) !== true &&
    options.handle.value?.contains(target) !== true;

  const onPointermove = (event: PointerEvent): void => {
    const view = options.view();
    const target = event.target;

    if (event.pointerType === PointerType.Touch) {
      return;
    }
    if (target instanceof Element && outside(target)) {
      release();
      return;
    }
    const point = target instanceof Element ? hoverPoint(target) : undefined;

    if (
      view === undefined ||
      point === undefined ||
      options.content.value?.contains(point) !== true ||
      menuOpen.value ||
      dragging.value ||
      held(view, point)
    ) {
      return;
    }
    const found = slotAt(view.state.doc, view.posAtDOM(point, 0));
    const next = found === undefined ? undefined : deepestSlot(view, found, event.clientY);

    if (sameSlot(next, hovered.value)) {
      return;
    }

    hovered.value = nearStart(event, view, next) ? next : undefined;
  };

  const onGripPointerdown = (event: PointerEvent): void => {
    const view = options.view();
    const current = slot.value;
    const element = view === undefined ? undefined : elementOf(view, current);

    if (current === undefined || element === undefined) {
      return;
    }

    drag.start(current, element, event);
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

      if (outer === undefined) {
        return;
      }

      hovered.value = outer;
      pin = { armed: false };
    },
  };
};
