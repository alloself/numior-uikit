import { computed, onScopeDispose, shallowRef, type ComputedRef, type Ref } from 'vue';
import { clampWidth, widthOf, type PlacedColumn, type TableLayout } from './table-layout';
import type { NuiTableMessages } from './table.messages';
import {
  TableColumnKind,
  TablePaneName,
  type NuiTableColumn,
  type NuiTableColumnResize,
  type NuiTableWidths,
} from './table.types';
import { Key } from '@numior/primitives';

export interface TableResizeOptions<T> {
  readonly widths: Ref<NuiTableWidths>;
  readonly layout: () => TableLayout;
  readonly room: () => number;
  readonly columnAt: (key: string) => NuiTableColumn<T>;
  readonly isRtl: () => boolean;
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
  readonly resized: (changes: readonly NuiTableColumnResize[]) => void;
}

export interface TableResize {
  readonly active: ComputedRef<string | undefined>;
  resizable(key: string): boolean;
  widthOf(key: string): number;
  start(key: string, event: PointerEvent): void;
  onKeydown(key: string, event: KeyboardEvent): boolean;
  reset(key: string): void;
}

interface Partner {
  readonly key: string;
  readonly width: number;
}

interface ResizeSession {
  readonly key: string;
  readonly pointerId: number;
  readonly origin: number;
  readonly width: number;
  readonly sign: number;
  readonly partner: Partner | undefined;
}

interface Latest {
  width: number;
  partner: number | undefined;
}

const STEP = 10;

const placedOf = (layout: TableLayout, key: string): PlacedColumn | undefined =>
  layout.visual.find((column) => column.key === key);

const partnerOf = (layout: TableLayout, placed: PlacedColumn): Partner | undefined => {
  const next = layout.visual[placed.visual + (placed.pane === TablePaneName.End ? -1 : 1)];
  return next?.kind === TableColumnKind.Data ? { key: next.key, width: next.width } : undefined;
};

const changesOf = (session: ResizeSession, latest: Latest): NuiTableColumnResize[] =>
  session.partner === undefined || latest.partner === undefined
    ? [{ key: session.key, width: latest.width }]
    : [
        { key: session.key, width: latest.width },
        { key: session.partner.key, width: latest.partner },
      ];

const withoutKey = (widths: NuiTableWidths, key: string): NuiTableWidths =>
  Object.fromEntries(Object.entries(widths).filter(([entry]) => entry !== key));

export const useTableResize = <T>(options: TableResizeOptions<T>): TableResize => {
  const session = shallowRef<ResizeSession>();
  const active = computed(() => session.value?.key);
  const latest: Latest = { width: 0, partner: undefined };

  const resizable = (key: string): boolean => options.columnAt(key).resizable !== false;

  const currentWidth = (key: string): number =>
    placedOf(options.layout(), key)?.width ?? widthOf(options.columnAt(key), options.widths.value);

  const write = (patch: NuiTableWidths): void => {
    const current = options.widths.value;

    if (!Object.entries(patch).some(([key, value]) => current[key] !== value)) {
      return;
    }

    options.widths.value = { ...current, ...patch };
  };

  const announceWidth = (key: string, width: number): void => {
    options.announce(
      options.messages.value.columnWidth({ column: options.columnAt(key).label, width }),
    );
  };

  const apply = (current: ResizeSession, delta: number): void => {
    const column = options.columnAt(current.key);
    const wanted = clampWidth(column, current.width + delta);

    if (current.partner === undefined) {
      latest.width = wanted;
      write({ [current.key]: wanted });
      return;
    }
    const partnerColumn = options.columnAt(current.partner.key);
    const partnerNext = clampWidth(partnerColumn, current.partner.width - (wanted - current.width));

    latest.width = current.width + (current.partner.width - partnerNext);
    latest.partner = partnerNext;
    write({ [current.key]: latest.width, [current.partner.key]: partnerNext });
  };

  const onMove = (event: PointerEvent): void => {
    const current = session.value;

    if (current === undefined || event.pointerId !== current.pointerId) {
      return;
    }

    apply(current, (event.clientX - current.origin) * current.sign);
  };

  const detach = (): void => {
    if (typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
  };

  const stop = (): void => {
    const current = session.value;

    detach();
    session.value = undefined;

    if (current === undefined) {
      return;
    }

    announceWidth(current.key, latest.width);

    if (latest.width === current.width) {
      return;
    }

    options.resized(changesOf(current, latest));
  };

  const start = (key: string, event: PointerEvent): void => {
    const layout = options.layout();
    const placed = placedOf(layout, key);

    if (event.button !== 0 || typeof window === 'undefined' || placed === undefined) {
      return;
    }
    event.preventDefault();

    const fits = layout.canvasWidth <= options.room();

    latest.width = placed.width;
    latest.partner = undefined;

    session.value = {
      key,
      pointerId: event.pointerId,
      origin: event.clientX,
      width: placed.width,
      sign: (options.isRtl() ? -1 : 1) * (placed.pane === TablePaneName.End ? -1 : 1),
      partner: fits ? partnerOf(layout, placed) : undefined,
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  const onKeydown = (key: string, event: KeyboardEvent): boolean => {
    const arrow = event.key === Key.ArrowLeft || event.key === Key.ArrowRight;

    if (!arrow || !event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) {
      return false;
    }
    event.preventDefault();

    if (!resizable(key)) {
      return true;
    }
    const grow = (event.key === Key.ArrowRight) !== options.isRtl();
    const before = currentWidth(key);
    const next = clampWidth(options.columnAt(key), before + (grow ? STEP : -STEP));

    write({ [key]: next });
    announceWidth(key, next);

    if (next !== before) {
      options.resized([{ key, width: next }]);
    }
    return true;
  };

  const reset = (key: string): void => {
    options.widths.value = withoutKey(options.widths.value, key);

    options.announce(
      options.messages.value.columnWidthReset({ column: options.columnAt(key).label }),
    );

    options.resized([{ key, width: undefined }]);
  };

  onScopeDispose(stop);

  return { active, resizable, widthOf: currentWidth, start, onKeydown, reset };
};
