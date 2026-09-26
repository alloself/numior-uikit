import { computed, onScopeDispose, shallowRef, type ComputedRef } from 'vue';
import type { NuiTableColumn } from './table.types';

const STEP = 10;
const FAST = 5;

export interface ColumnResizeOptions<T> {
  readonly widthOf: (column: NuiTableColumn<T>) => number | undefined;
  readonly setWidth: (key: string, px: number) => void;
  readonly resetWidth: (key: string) => void;
  readonly rtl: () => boolean;
}

interface ResizeSession {
  readonly key: string;
  readonly pointerId: number;
  readonly startX: number;
  readonly startWidth: number;
}

export interface ColumnResize<T> {
  readonly active: ComputedRef<string | undefined>;
  start(column: NuiTableColumn<T>, event: PointerEvent): void;
  onKeydown(column: NuiTableColumn<T>, event: KeyboardEvent): void;
}

const baseWidth = <T>(
  column: NuiTableColumn<T>,
  widthOf: (column: NuiTableColumn<T>) => number | undefined,
  handle: EventTarget | null,
): number => {
  const measured = widthOf(column);
  if (measured !== undefined) {
    return measured;
  }
  const cell = handle instanceof HTMLElement ? handle.parentElement : null;
  return cell instanceof HTMLElement ? cell.offsetWidth : 0;
};

const keyDelta = (event: KeyboardEvent, rtl: boolean): number => {
  const grow = rtl ? 'ArrowLeft' : 'ArrowRight';
  const shrink = rtl ? 'ArrowRight' : 'ArrowLeft';
  const step = event.shiftKey ? STEP * FAST : STEP;
  if (event.key === grow) {
    return step;
  }
  return event.key === shrink ? -step : 0;
};

export const useColumnResize = <T>(options: ColumnResizeOptions<T>): ColumnResize<T> => {
  const session = shallowRef<ResizeSession>();
  const active = computed(() => session.value?.key);

  const detach = (): void => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', onPointermove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    }
  };

  const stop = (): void => {
    detach();
    session.value = undefined;
  };

  const onPointermove = (event: PointerEvent): void => {
    const current = session.value;

    if (!current || event.pointerId !== current.pointerId) {
      return;
    }

    const delta = event.clientX - current.startX;

    options.setWidth(current.key, current.startWidth + (options.rtl() ? -delta : delta));
  };

  const start = (column: NuiTableColumn<T>, event: PointerEvent): void => {
    if (event.button !== 0 || typeof window === 'undefined') {
      return;
    }
    event.preventDefault();

    session.value = {
      key: column.key,
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: baseWidth(column, options.widthOf, event.currentTarget),
    };

    window.addEventListener('pointermove', onPointermove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  const onKeydown = (column: NuiTableColumn<T>, event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      options.resetWidth(column.key);
      return;
    }
    const delta = keyDelta(event, options.rtl());
    if (delta === 0) {
      return;
    }
    event.preventDefault();
    options.setWidth(column.key, baseWidth(column, options.widthOf, event.currentTarget) + delta);
  };

  onScopeDispose(stop);

  return { active, start, onKeydown };
};
