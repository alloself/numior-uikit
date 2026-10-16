import { moveBlock, type ChildSlot, type Command } from '@numior/editor-core';
import type { EditorView } from '@numior/editor-core/view';
import { useEdgeScroll } from '@numior/primitives';
import { computed, shallowRef, type ComputedRef, type Ref } from 'vue';
import {
  elementOf,
  ghostOf,
  markerSpace,
  marginStart,
  paddingBox,
  startEdge,
} from './block-geometry';
import { dropTargetAt, type DropTarget } from './drop-target';

export interface BlockDragOptions {
  readonly frame: Readonly<Ref<HTMLElement | null>>;
  readonly content: Readonly<Ref<HTMLElement | null>>;
  readonly drop: Readonly<Ref<HTMLElement | null>>;
  readonly ghost: Readonly<Ref<HTMLElement | null>>;
  readonly view: () => EditorView | undefined;
  readonly run: (command: Command) => boolean;
  readonly rtl: () => boolean;
  readonly onDone: () => void;
}

export interface BlockDrag {
  readonly source: ComputedRef<ChildSlot | undefined>;
  readonly dragging: ComputedRef<boolean>;
  readonly aiming: ComputedRef<boolean>;
  start(slot: ChildSlot, element: Element, event: PointerEvent): void;
}

interface Session {
  readonly slot: ChildSlot;
  readonly pointerId: number;
  readonly originX: number;
  readonly originY: number;
  readonly offset: number;
  readonly copy: Element | undefined;
  readonly moving: boolean;
  readonly x: number;
  readonly y: number;
  readonly target: DropTarget | undefined;
}

const THRESHOLD = 5;

const LIFTED = 'nui-editor__lifted';

export const useBlockDrag = (options: BlockDragOptions): BlockDrag => {
  const session = shallowRef<Session | undefined>();
  let lifted: Element | undefined;
  let ghostHeight = 0;

  const lift = (element: Element | undefined): void => {
    if (element !== lifted) {
      lifted?.classList.remove(LIFTED);
      element?.classList.add(LIFTED);
      lifted = element;
    }
  };

  const placeLine = (target: DropTarget | undefined): void => {
    const line = options.drop.value;
    const frame = paddingBox(options.frame.value);
    const rect = target?.anchor.getBoundingClientRect();

    if (line === null || frame === undefined || target === undefined || rect === undefined) {
      line?.style.removeProperty('top');
      return;
    }
    const start = startEdge(frame, target.anchor, options.rtl());

    line.style.top = `${String((target.edge === 'top' ? rect.top : rect.bottom) - frame.top)}px`;
    line.style.insetInlineStart = `${String(start)}px`;
    line.style.inlineSize = `${String(rect.width + marginStart(target.anchor) + markerSpace(target.anchor))}px`;
  };

  const placeGhost = (current: Session): void => {
    const ghost = options.ghost.value;
    const frame = paddingBox(options.frame.value);

    if (ghost === null || frame === undefined) {
      return;
    }
    if (ghost.firstChild !== (current.copy ?? null)) {
      ghost.replaceChildren(...(current.copy === undefined ? [] : [current.copy]));
      ghostHeight = ghost.offsetHeight;
    }

    const top = Math.min(
      Math.max(0, current.y - frame.top - current.offset),
      Math.max(0, frame.height - ghostHeight),
    );

    ghost.style.setProperty('--_ghost-top', `${String(top)}px`);
  };

  const retarget = (current: Session): Session => {
    const view = options.view();
    const content = options.content.value;

    const target =
      view === undefined || content === null
        ? undefined
        : dropTargetAt(view, content, current.slot, current.x, current.y);

    return { ...current, target };
  };

  const show = (current: Session): void => {
    const view = options.view();

    session.value = current;
    lift(view === undefined ? undefined : elementOf(view, current.slot));
    placeLine(current.target);
    placeGhost(current);
  };

  const edge = useEdgeScroll({
    container: options.frame,
    onStep: () => {
      if (session.value?.moving === true) {
        show(retarget(session.value));
      }
    },
  });

  const finish = (): void => {
    edge.stop();
    window.removeEventListener('pointermove', onPointermove);
    window.removeEventListener('pointerup', onPointerup);
    window.removeEventListener('pointercancel', finish);
    window.removeEventListener('keydown', onKeydown);
    lift(undefined);
    placeLine(undefined);
    session.value = undefined;
  };

  const onPointermove = (event: PointerEvent): void => {
    const current = session.value;

    if (current === undefined || event.pointerId !== current.pointerId) {
      return;
    }
    const distance = Math.hypot(event.clientX - current.originX, event.clientY - current.originY);

    if (!current.moving && distance < THRESHOLD) {
      return;
    }
    event.preventDefault();
    show(retarget({ ...current, moving: true, x: event.clientX, y: event.clientY }));
    edge.follow({ y: event.clientY });
  };

  const onPointerup = (event: PointerEvent): void => {
    const current = session.value;

    if (current === undefined || event.pointerId !== current.pointerId) {
      return;
    }
    const target = current.moving ? current.target : undefined;

    finish();
    if (target !== undefined) {
      options.run(moveBlock(current.slot, target.to));
      options.onDone();
    }
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      finish();
    }
  };

  return {
    source: computed(() => session.value?.slot),
    dragging: computed(() => session.value?.moving === true),
    aiming: computed(() => session.value?.target !== undefined),
    start: (slot, element, event) => {
      const frame = paddingBox(options.frame.value);
      const rect = element.getBoundingClientRect();
      const ghost = options.ghost.value;

      if (event.button !== 0 || session.value !== undefined || frame === undefined) {
        return;
      }

      ghost?.style.setProperty(
        '--_ghost-start',
        `${String(startEdge(frame, element, options.rtl()))}px`,
      );

      ghost?.style.setProperty(
        '--_ghost-width',
        `${String(rect.width + marginStart(element) + markerSpace(element))}px`,
      );

      session.value = {
        slot,
        pointerId: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
        offset: event.clientY - rect.top,
        copy: ghostOf(element),
        moving: false,
        x: event.clientX,
        y: event.clientY,
        target: undefined,
      };

      window.addEventListener('pointermove', onPointermove);
      window.addEventListener('pointerup', onPointerup);
      window.addEventListener('pointercancel', finish);
      window.addEventListener('keydown', onKeydown);
    },
  };
};
