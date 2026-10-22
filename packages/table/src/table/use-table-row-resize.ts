import { computed, onScopeDispose, shallowRef, type ComputedRef, type Ref } from 'vue';
import type { NuiTableMessages } from './table.messages';
import type { NuiTableRowHeights } from './table.types';

export interface TableRowResizeOptions {
  readonly enabled: () => boolean;
  readonly heights: Ref<NuiTableRowHeights>;
  readonly rowSize: () => number;
  readonly keyAt: (position: number) => string | undefined;
  readonly labelAt: (position: number) => string;
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
}

export interface TableRowResize {
  readonly active: ComputedRef<number | undefined>;
  start(position: number, event: PointerEvent): void;
  reset(position: number): void;
  onKeydown(event: KeyboardEvent, position: number | undefined): boolean;
}

interface RowResizeSession {
  readonly position: number;
  readonly key: string;
  readonly pointerId: number;
  readonly origin: number;
  readonly height: number;
}

const STEP = 8;
const SMALLEST_HEIGHT = 20;

const clampHeight = (px: number): number => Math.max(SMALLEST_HEIGHT, Math.round(px));

const withoutKey = (heights: NuiTableRowHeights, key: string): NuiTableRowHeights =>
  Object.fromEntries(Object.entries(heights).filter(([entry]) => entry !== key));

const renderedHeight = (target: EventTarget | null): number | undefined =>
  target instanceof Element ? target.closest('tr')?.getBoundingClientRect().height : undefined;

const isSizeKey = (event: KeyboardEvent): boolean =>
  (event.key === 'ArrowUp' || event.key === 'ArrowDown') &&
  event.altKey &&
  !event.shiftKey &&
  !event.ctrlKey &&
  !event.metaKey;

export const useTableRowResize = (options: TableRowResizeOptions): TableRowResize => {
  const session = shallowRef<RowResizeSession>();
  const active = computed(() => session.value?.position);
  const latest = { height: 0 };

  const write = (key: string, height: number): void => {
    latest.height = height;

    if (options.heights.value[key] !== height) {
      options.heights.value = { ...options.heights.value, [key]: height };
    }
  };

  const announceHeight = (position: number, height: number): void => {
    options.announce(options.messages.value.rowHeight({ row: options.labelAt(position), height }));
  };

  const onMove = (event: PointerEvent): void => {
    const current = session.value;

    if (current !== undefined && event.pointerId === current.pointerId) {
      write(current.key, clampHeight(current.height + event.clientY - current.origin));
    }
  };

  const detach = (): void => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    }
  };

  const stop = (): void => {
    const current = session.value;

    detach();
    session.value = undefined;

    if (current !== undefined) {
      announceHeight(current.position, latest.height);
    }
  };

  const start = (position: number, event: PointerEvent): void => {
    const key = options.keyAt(position);

    if (!options.enabled() || event.button !== 0 || key === undefined) {
      return;
    }
    const rendered = renderedHeight(event.target) ?? 0;
    const height = rendered > 0 ? rendered : (options.heights.value[key] ?? options.rowSize());

    event.preventDefault();
    event.stopPropagation();
    latest.height = height;

    session.value = {
      position,
      key,
      pointerId: event.pointerId,
      origin: event.clientY,
      height,
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  const reset = (position: number): void => {
    const key = options.keyAt(position);

    if (!options.enabled() || key === undefined || !(key in options.heights.value)) {
      return;
    }
    options.heights.value = withoutKey(options.heights.value, key);
    options.announce(options.messages.value.rowHeightReset({ row: options.labelAt(position) }));
  };

  const onKeydown = (event: KeyboardEvent, position: number | undefined): boolean => {
    const key = position === undefined ? undefined : options.keyAt(position);

    if (!options.enabled() || position === undefined || key === undefined || !isSizeKey(event)) {
      return false;
    }
    const current = options.heights.value[key] ?? options.rowSize();
    const next = clampHeight(current + (event.key === 'ArrowDown' ? STEP : -STEP));

    event.preventDefault();
    write(key, next);
    announceHeight(position, next);
    return true;
  };

  onScopeDispose(stop);

  return { active, start, reset, onKeydown };
};
