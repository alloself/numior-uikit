import {
  computed,
  onMounted,
  onScopeDispose,
  watch,
  type ComputedRef,
  type ShallowRef,
  type WatchSource,
} from 'vue';
import { createSizeIndex, type ItemSize, type VirtualSize } from '@numior/primitives';
import type { TableEngine, TableNodeId } from '../engine';
import { OWN_BODY_ROWS, OWN_DETAIL_ROWS } from './table-dom';
import type { TableDetailSpot, TableRowMode } from './table.types';

export interface TableRowSizesOptions<T> {
  readonly viewport: Readonly<ShallowRef<HTMLElement | null>>;
  readonly engine: Readonly<ShallowRef<TableEngine<T>>>;
  readonly mode: () => TableRowMode;
  readonly rowSize: () => number;
  readonly count: () => number;
  readonly pageStart: () => number;
  readonly leading: () => number;
  readonly spots: () => readonly TableDetailSpot[];
  readonly arrangement: () => number;
  readonly rendered: WatchSource;
  readonly resize: (sizes: readonly VirtualSize[]) => void;
}

export interface TableRowSizes {
  readonly itemSize: ComputedRef<ItemSize>;
}

const DETAIL_ROWS = 4;

const measuredRows = (mode: TableRowMode, details: number): string | undefined => {
  switch (mode) {
    case 'flow':
      return undefined;
    case 'fixed':
      return details === 0 ? undefined : OWN_DETAIL_ROWS;
    case 'fluid':
      return OWN_BODY_ROWS;
  }
};

const sizeOf = (entry: ResizeObserverEntry): number =>
  entry.borderBoxSize[0]?.blockSize ?? entry.target.getBoundingClientRect().height;

const positionOf = (cell: Element, leading: number): number =>
  Number(cell.parentElement?.getAttribute('aria-rowindex')) - leading - 1;

const firstCells = (rows: Iterable<Element>): Element[] =>
  [...rows].flatMap((row) => (row.firstElementChild === null ? [] : [row.firstElementChild]));

export const useTableRowSizes = <T>(options: TableRowSizesOptions<T>): TableRowSizes => {
  const detailSizes = new Map<TableNodeId, number>();
  let detailEstimate: number | undefined;
  let observer: ResizeObserver | undefined;

  const indexOf = (base: number): ItemSize =>
    createSizeIndex(
      options.count(),
      base,
      options
        .spots()
        .map((spot) => [
          spot.position,
          detailSizes.get(spot.id) ?? detailEstimate ?? base * DETAIL_ROWS,
        ]),
    );

  const sizeFor = (mode: TableRowMode, base: number): ItemSize => {
    switch (mode) {
      case 'flow':
        return base;
      case 'fixed':
        return options.spots().length === 0 ? base : indexOf(base);
      case 'fluid':
        void options.arrangement();
        return indexOf(base);
    }
  };

  const itemSize = computed(() => sizeFor(options.mode(), options.rowSize()));

  const remember = (position: number, size: number): void => {
    const node = options.engine.value.nodeAt(options.pageStart() + position);

    if (node?.kind === 'detail') {
      detailSizes.set(node.id, size);
      detailEstimate = size;
    }
  };

  const onResize = (entries: readonly ResizeObserverEntry[]): void => {
    const leading = options.leading();
    const sizes: VirtualSize[] = [];

    for (const entry of entries) {
      const size = sizeOf(entry);
      const position = positionOf(entry.target, leading);

      if (size > 0 && Number.isInteger(position) && position >= 0) {
        sizes.push([position, size]);
        remember(position, size);
      }
    }
    if (sizes.length > 0) {
      options.resize(sizes);
    }
  };

  const targets = (): Element[] => {
    const viewport = options.viewport.value;
    const rows = measuredRows(options.mode(), options.spots().length);

    return viewport === null || rows === undefined
      ? []
      : firstCells(viewport.querySelectorAll(rows));
  };

  const observe = (): void => {
    observer?.disconnect();

    for (const target of targets()) {
      observer?.observe(target);
    }
  };

  onMounted(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    observer = new ResizeObserver(onResize);
    watch(options.rendered, observe, { immediate: true, flush: 'post' });
  });

  onScopeDispose(() => {
    observer?.disconnect();
  });

  return { itemSize };
};
