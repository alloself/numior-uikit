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
import type { TableDetailSpot } from './table.types';

export interface TableRowSizesOptions<T> {
  readonly viewport: Readonly<ShallowRef<HTMLElement | null>>;
  readonly engine: Readonly<ShallowRef<TableEngine<T>>>;
  readonly windowed: () => boolean;
  readonly fluid: () => boolean;
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

  const itemSize = computed<ItemSize>(() => {
    const base = options.rowSize();
    const windowed = options.windowed();
    const spots = windowed ? options.spots() : [];
    const fluid = windowed && options.fluid();

    if (!fluid && spots.length === 0) {
      return base;
    }
    if (fluid) {
      void options.arrangement();
    }
    return createSizeIndex(
      options.count(),
      base,
      spots.map((spot) => [
        spot.position,
        detailSizes.get(spot.id) ?? detailEstimate ?? base * DETAIL_ROWS,
      ]),
    );
  });

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
    const fluid = options.fluid();

    if (viewport === null || !options.windowed() || (!fluid && options.spots().length === 0)) {
      return [];
    }
    return firstCells(viewport.querySelectorAll(fluid ? OWN_BODY_ROWS : OWN_DETAIL_ROWS));
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
