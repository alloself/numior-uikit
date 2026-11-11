import { Direction, PointerType } from '@numior/primitives';
import { computed, shallowRef } from 'vue';
import { PivotArea } from '../../core';
import {
  PivotDragKind,
  PivotDragPhase,
  PivotDropKind,
  type PivotDrag,
  type PivotDragOptions,
  type PivotDragOrigin,
  type PivotDragState,
  type PivotDropTarget,
} from './pivot-panel.types';

const THRESHOLD = 5;

const GHOST_EDGE = 12;

const CHIP = '.nui-spreadsheet-pivot__chip';

const IDLE: PivotDragState = { phase: PivotDragPhase.Idle };

const inside = (element: Element, x: number, y: number): boolean => {
  const box = element.getBoundingClientRect();

  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
};

const chipsOf = (list: HTMLElement): Element[] => [...list.querySelectorAll(CHIP)];

const chipIndexAt = (list: HTMLElement, y: number): number =>
  chipsOf(list).reduce((count, chip) => {
    const box = chip.getBoundingClientRect();

    return box.top + box.height / 2 < y ? count + 1 : count;
  }, 0);

const dropLineAt = (list: HTMLElement, index: number): number => {
  const top = list.getBoundingClientRect().top;
  const chips = chipsOf(list);
  const next = chips[index];
  const last = chips.at(-1);

  if (next !== undefined) {
    return next.getBoundingClientRect().top - top;
  }
  return last === undefined ? 0 : last.getBoundingClientRect().bottom - top;
};

const accepts = (origin: PivotDragOrigin, target: PivotDropTarget): boolean => {
  if (target.kind === PivotDropKind.List) {
    return origin.kind === PivotDragKind.Chip && !origin.chip.values;
  }
  return (
    origin.kind === PivotDragKind.Field ||
    !origin.chip.values ||
    target.spot.area === PivotArea.Rows ||
    target.spot.area === PivotArea.Columns
  );
};

const targetKey = (target: PivotDropTarget | undefined): string => {
  if (target === undefined) {
    return '';
  }
  return target.kind === PivotDropKind.List
    ? target.kind
    : `${target.spot.area}:${String(target.spot.index)}`;
};

export const usePivotDrag = (options: PivotDragOptions): PivotDrag => {
  const state = shallowRef<PivotDragState>(IDLE);

  let grab = { x: 0, y: 0 };
  let width = 0;
  let swallowClick = false;

  const dragging = computed(() => state.value.phase === PivotDragPhase.Dragging);

  const targetAt = (origin: PivotDragOrigin, x: number, y: number): PivotDropTarget | undefined => {
    const list = options.list();
    let found: PivotDropTarget | undefined;

    options.areas().forEach((element: HTMLElement, area: PivotArea) => {
      if (found !== undefined || !inside(element, x, y)) {
        return;
      }

      found = { kind: PivotDropKind.Area, spot: { area, index: chipIndexAt(element, y) } };
    });

    if (found === undefined && list !== null && inside(list, x, y)) {
      found = { kind: PivotDropKind.List };
    }
    return found !== undefined && accepts(origin, found) ? found : undefined;
  };

  const placeGhost = (event: PointerEvent): void => {
    const ghost = options.ghost();
    const panel = options.panel();

    if (ghost === null || panel === null) {
      return;
    }

    const box = panel.getBoundingClientRect();
    const left = event.clientX - grab.x;
    const rtl = getComputedStyle(panel).direction === Direction.Rtl;
    const x = rtl ? left - box.right + ghost.offsetWidth : left - box.left;
    const y = event.clientY - box.top - grab.y;

    ghost.style.transform = `translate(${String(x)}px, ${String(y)}px)`;
  };

  const sizeGhost = (origin: PivotDragOrigin): void => {
    const ghost = options.ghost();

    if (ghost === null) {
      return;
    }

    ghost.style.inlineSize = origin.kind === PivotDragKind.Chip ? `${String(width)}px` : '';
    grab = { x: Math.min(grab.x, Math.max(0, ghost.offsetWidth - GHOST_EDGE)), y: grab.y };
  };

  const placeLine = (target: PivotDropTarget | undefined): void => {
    if (target?.kind !== PivotDropKind.Area) {
      return;
    }

    const element = options.areas().get(target.spot.area);

    element?.style.setProperty('--_drop', `${String(dropLineAt(element, target.spot.index))}px`);
  };

  const release = (pointerId: number): void => {
    const panel = options.panel();

    if (panel?.hasPointerCapture(pointerId) !== true) {
      return;
    }

    panel.releasePointerCapture(pointerId);
  };

  const onPointerdown = (origin: PivotDragOrigin, event: PointerEvent): void => {
    const element = event.currentTarget;

    if (
      event.button !== 0 ||
      !(element instanceof HTMLElement) ||
      (origin.kind === PivotDragKind.Field && event.pointerType === PointerType.Touch)
    ) {
      return;
    }

    const box = element.getBoundingClientRect();

    swallowClick = false;
    grab = { x: event.clientX - box.left, y: event.clientY - box.top };
    width = box.width;

    state.value = {
      phase: PivotDragPhase.Pending,
      origin,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  };

  const onPointermove = (event: PointerEvent): void => {
    const current = state.value;

    if (current.phase === PivotDragPhase.Idle || current.pointerId !== event.pointerId) {
      return;
    }
    if (
      current.phase === PivotDragPhase.Pending &&
      Math.hypot(event.clientX - current.x, event.clientY - current.y) < THRESHOLD
    ) {
      return;
    }
    if (current.phase === PivotDragPhase.Pending) {
      options.panel()?.setPointerCapture(event.pointerId);
      sizeGhost(current.origin);
    }

    const target = targetAt(current.origin, event.clientX, event.clientY);

    placeGhost(event);
    placeLine(target);

    if (
      current.phase !== PivotDragPhase.Pending &&
      targetKey(current.target) === targetKey(target)
    ) {
      return;
    }

    state.value = {
      phase: PivotDragPhase.Dragging,
      origin: current.origin,
      pointerId: current.pointerId,
      target,
    };
  };

  const onPointerup = (event: PointerEvent): void => {
    const current = state.value;

    if (current.phase === PivotDragPhase.Idle || current.pointerId !== event.pointerId) {
      return;
    }

    state.value = IDLE;
    release(event.pointerId);

    if (current.phase !== PivotDragPhase.Dragging) {
      return;
    }

    swallowClick = true;

    if (current.target === undefined) {
      options.cancelled();
    } else {
      options.drop(current.origin, current.target);
    }
  };

  const onClickCapture = (event: MouseEvent): void => {
    if (!swallowClick) {
      return;
    }

    swallowClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const cancel = (): void => {
    const current = state.value;

    if (current.phase === PivotDragPhase.Idle) {
      return;
    }

    state.value = IDLE;
    release(current.pointerId);

    if (current.phase !== PivotDragPhase.Dragging) {
      return;
    }

    options.cancelled();
  };

  return { state, dragging, onPointerdown, onPointermove, onPointerup, onClickCapture, cancel };
};
