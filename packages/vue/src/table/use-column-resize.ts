import { onScopeDispose, ref, type Ref } from 'vue';
import type { NuiTableColumn } from './table.types';

const STEP = 10;
const FAST = 5;

export interface ColumnResizeOptions<T> {
  readonly widthOf: (column: NuiTableColumn<T>) => number | undefined;
  readonly setWidth: (key: string, px: number) => void;
  readonly resetWidth: (key: string) => void;
  readonly rtl: () => boolean;
}

export interface ColumnResize<T> {
  readonly active: Ref<string | undefined>;
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
  const active = ref<string>();
  const origin = { client: 0, width: 0, key: '', pointerId: -1 };

  const detach = (): void => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', onPointermove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    }
  };
  const stop = (): void => {
    detach();
    active.value = undefined;
  };
  const onPointermove = (event: PointerEvent): void => {
    if (event.pointerId !== origin.pointerId) {
      return;
    }
    const delta = event.clientX - origin.client;
    options.setWidth(origin.key, origin.width + (options.rtl() ? -delta : delta));
  };

  const start = (column: NuiTableColumn<T>, event: PointerEvent): void => {
    if (event.button !== 0 || typeof window === 'undefined') {
      return;
    }
    event.preventDefault();
    origin.client = event.clientX;
    origin.width = baseWidth(column, options.widthOf, event.currentTarget);
    origin.key = column.key;
    origin.pointerId = event.pointerId;
    active.value = column.key;
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
