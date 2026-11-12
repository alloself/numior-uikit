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
import { TableNodeKind, type TableEngine, type TableNodeId } from '../engine';
import { OWN_BODY_ROWS, OWN_DETAIL_ROWS, rowPositionOf } from './table-dom';
import { TableRowMode, type NuiTableRowHeights, type TableDetailSpot } from './table.types';

export interface TableRowSizesOptions<T> {
  readonly viewport: Readonly<ShallowRef<HTMLElement | null>>;
  readonly engine: Readonly<ShallowRef<TableEngine<T>>>;
  readonly mode: () => TableRowMode;
  readonly measured: () => boolean;
  readonly rowSize: () => number;
  readonly count: () => number;
  readonly pageStart: () => number;
  readonly leading: () => number;
  readonly spots: () => readonly TableDetailSpot[];
  readonly heights: () => NuiTableRowHeights;
  readonly arrangement: () => number;
  readonly rendered: WatchSource;
  readonly resize: (sizes: readonly VirtualSize[]) => void;
}

export interface TableRowSizes {
  readonly itemSize: ComputedRef<ItemSize>;
}

const DETAIL_ROWS = 4;
const NO_POSITIONS: ReadonlyMap<string, number> = new Map();

const measuredRows = (
  mode: TableRowMode,
  details: number,
  measured: boolean,
): string | undefined => {
  switch (mode) {
    case TableRowMode.Flow:
      return measured ? OWN_BODY_ROWS : undefined;
    case TableRowMode.Fixed:
      return details === 0 ? undefined : OWN_DETAIL_ROWS;
    case TableRowMode.Fluid:
      return OWN_BODY_ROWS;
  }
};

const sizeOf = (entry: ResizeObserverEntry): number =>
  entry.borderBoxSize[0]?.blockSize ?? entry.target.getBoundingClientRect().height;

const positionOf = (cell: Element, leading: number): number =>
  rowPositionOf(cell.parentElement, leading);

const firstCells = (rows: Iterable<Element>): Element[] =>
  [...rows].flatMap((row) => {
    const cell = row.querySelector(':scope > :not([rowspan])');

    return cell === null ? [] : [cell];
  });

export const useTableRowSizes = <T>(options: TableRowSizesOptions<T>): TableRowSizes => {
  const detailSizes = new Map<TableNodeId, number>();
  let detailEstimate: number | undefined;
  let observer: ResizeObserver | undefined;
  let heights = options.heights();

  const sizedKeys = computed(() => Object.keys(options.heights()).toSorted().join('\u0000'));

  const sizedPositions = computed((): ReadonlyMap<string, number> => {
    const keys = new Set(sizedKeys.value === '' ? [] : sizedKeys.value.split('\u0000'));

    void options.arrangement();

    if (keys.size === 0 || options.mode() === TableRowMode.Fluid) {
      return NO_POSITIONS;
    }
    const start = options.pageStart();
    const end = start + options.count();
    const found = options.engine.value.positionsOf((id) => keys.has(String(id)), keys.size);

    return new Map(
      found.flatMap(([id, position]) =>
        position >= start && position < end ? [[String(id), position - start]] : [],
      ),
    );
  });

  const sizedRows = (base: number): VirtualSize[] =>
    [...sizedPositions.value].map(([key, position]) => [position, heights[key] ?? base]);

  const indexOf = (base: number): ItemSize =>
    createSizeIndex(options.count(), base, [
      ...options
        .spots()
        .map((spot): VirtualSize => [
          spot.position,
          detailSizes.get(spot.id) ?? detailEstimate ?? base * DETAIL_ROWS,
        ]),
      ...sizedRows(base),
    ]);

  const flowSize = (base: number): ItemSize => {
    if (options.measured()) {
      void options.arrangement();
      return indexOf(base);
    }
    return sizedPositions.value.size === 0
      ? base
      : createSizeIndex(options.count(), base, sizedRows(base));
  };

  const sizeFor = (mode: TableRowMode, base: number): ItemSize => {
    switch (mode) {
      case TableRowMode.Flow:
        return flowSize(base);
      case TableRowMode.Fixed:
        return options.spots().length === 0 && sizedPositions.value.size === 0
          ? base
          : indexOf(base);
      case TableRowMode.Fluid:
        void options.arrangement();
        return indexOf(base);
    }
  };

  const itemSize = computed(() => sizeFor(options.mode(), options.rowSize()));

  const remember = (position: number, size: number): void => {
    const node = options.engine.value.nodeAt(options.pageStart() + position);

    if (node?.kind !== TableNodeKind.Detail) {
      return;
    }

    detailSizes.set(node.id, size);
    detailEstimate = size;
  };

  const onResize = (entries: readonly ResizeObserverEntry[]): void => {
    const leading = options.leading();
    const sizes: VirtualSize[] = [];

    for (const entry of entries) {
      const size = sizeOf(entry);
      const position = positionOf(entry.target, leading);

      if (size <= 0 || !Number.isInteger(position) || position < 0) {
        continue;
      }

      sizes.push([position, size]);
      remember(position, size);
    }
    if (sizes.length === 0) {
      return;
    }

    options.resize(sizes);
  };

  watch(
    options.heights,
    (next, previous) => {
      const changed: VirtualSize[] = [];

      heights = next;

      for (const [key, position] of sizedPositions.value) {
        const size = next[key];

        if (size === undefined || previous[key] === undefined || size === previous[key]) {
          continue;
        }

        changed.push([position, size]);
      }
      if (changed.length === 0) {
        return;
      }

      options.resize(changed);
    },
    { flush: 'sync' },
  );

  const targets = (): Element[] => {
    const viewport = options.viewport.value;
    const rows = measuredRows(options.mode(), options.spots().length, options.measured());

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
    watch([options.rendered, options.measured], observe, { immediate: true, flush: 'post' });
  });

  onScopeDispose(() => {
    observer?.disconnect();
  });

  return { itemSize };
};
