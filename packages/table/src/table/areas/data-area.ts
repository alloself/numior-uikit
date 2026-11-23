import {
  computed,
  onMounted,
  ref,
  shallowReactive,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue';
import { createIntent, createVersion, type Intent, type VersionRead } from '@numior/primitives';
import {
  createSourceEngine,
  createTableEngine,
  TableNodeKind,
  type TableEngine,
  type TableFilter,
  type TableNodeId,
  type TableQuery,
  type TableSource,
} from '../../engine';
import { forgetCellReads } from '../table-cells';
import { engineColumnOf } from '../table-format';
import { pageWindowOf, resolvePagination } from '../table-pages';
import { boxOf } from '../table-ranges';
import { useTableQuery } from '../use-table-query';
import { useTableWarmup } from '../use-table-warmup';
import type {
  NuiTableColumn,
  NuiTableColumnDef,
  NuiTableExpanded,
  NuiTableFilters,
  NuiTableGroupBy,
  NuiTableHidden,
  NuiTablePagination,
  NuiTableRanges,
  NuiTableSort,
  TableRowPlaces,
} from '../table.types';
import { useGroupsArea, type GroupsArea } from './groups-area';
import type { TableContext, TableShell } from './table-context';

export interface DataAreaOptions<T> {
  readonly shell: TableShell<T>;
  readonly rows: () => readonly T[];
  readonly columns: () => readonly NuiTableColumnDef<T>[];
  readonly leaves: () => readonly NuiTableColumn<T>[];
  readonly source: () => TableSource<T> | undefined;
  readonly getKey: () => ((row: T) => TableNodeId) | undefined;
  readonly getChildren: () => ((row: T) => readonly T[] | null | undefined) | undefined;
  readonly hasChildren: () => ((row: T) => boolean) | undefined;
  readonly hasDetail: () => ((row: T) => boolean) | undefined;
  readonly detailSlot: () => boolean;
  readonly blockSize: () => number;
  readonly pagination: () => NuiTablePagination | boolean | undefined;
  readonly height: () => string | undefined;
  readonly page: Ref<number>;
  readonly pageSize: Ref<number>;
  readonly remote: () => boolean;
  readonly total: () => number | undefined;
  readonly pinned: () => readonly T[];
  readonly loading: () => boolean;
  readonly expanded: Ref<NuiTableExpanded>;
  readonly expandedNow: Readonly<Ref<NuiTableExpanded>>;
  readonly quick: Ref<string>;
  readonly sorting: () => NuiTableSort;
  readonly filters: () => NuiTableFilters;
  readonly groupBy: () => NuiTableGroupBy;
  readonly hidden: () => NuiTableHidden;
  readonly treeColumn: () => string | undefined;
  readonly totalsLabel: () => string | undefined;
  readonly locale: () => string;
  readonly windowed: () => boolean;
  readonly clampActive: () => void;
  readonly places: () => TableRowPlaces<T>;
  readonly resetEdits: () => void;
  readonly refocusMoved: () => void;
}

export interface DataArea<T> extends Omit<GroupsArea<T>, 'grouping'> {
  readonly table: TableContext<T>;
  readonly paginationProps: ComputedRef<NuiTablePagination | undefined>;
  readonly loadingNow: ComputedRef<boolean>;
  readonly rowCount: Readonly<Ref<number>>;
  readonly revision: VersionRead;
  readonly arrangement: VersionRead;
  readonly rowsIntent: Intent<true>;
  readonly pageStart: ComputedRef<number>;
  readonly pinnedCount: ComputedRef<number>;
  readonly visibleRows: ComputedRef<number>;
  readonly totalCount: ComputedRef<number>;
  readonly footRows: ComputedRef<number>;
  readonly queryBusy: Readonly<Ref<boolean>>;
  readonly sync: () => void;
  readonly applyChanged: (keys: readonly string[], changed?: readonly T[]) => void;
  readonly revisionOf: (position: number) => number;
  readonly invalidate: (list?: NuiTableRanges) => void;
  readonly refresh: () => void;
  readonly watchSources: () => void;
}

const NAMED_ROWS = 10_000;

export const useDataArea = <T>(own: DataAreaOptions<T>): DataArea<T> => {
  const { shell } = own;

  const paginationProps = computed(() =>
    resolvePagination(
      own.source() !== undefined && own.height() === undefined && own.pagination() === undefined
        ? true
        : own.pagination(),
    ),
  );

  const sourceChanges = ref(0);

  const onSourceChange = (): void => {
    sourceChanges.value += 1;
  };

  const onSourceError = (error: unknown): void => {
    shell.emit('error', error);
    shell.announce(shell.messages.value.loadFailed);
  };

  const detailTest = (): ((row: T) => boolean) | undefined =>
    own.detailSlot() ? (row) => own.hasDetail()?.(row) ?? true : undefined;

  const createEngine = (): TableEngine<T> => {
    const source = own.source();

    return source === undefined
      ? createTableEngine({
          columns: own.leaves().map(engineColumnOf),
          keyOf: own.getKey(),
          children: own.getChildren(),
          hasChildren: own.hasChildren(),
          detail: detailTest(),
          defaultExpanded: false,
        })
      : createSourceEngine({
          source,
          keyOf: own.getKey(),
          hasChildren: own.hasChildren(),
          detail: detailTest(),
          blockSize: () =>
            paginationProps.value === undefined ? own.blockSize() : own.pageSize.value,
          onChange: onSourceChange,
          onError: onSourceError,
        });
  };

  const engine = shallowRef(createEngine());
  const waiting = ref(!engine.value.settled());
  const loadingNow = computed(() => own.loading() || waiting.value);
  const rowCount = ref(0);
  const revision = createVersion();
  const touched = shallowReactive(new Map<number, number>());
  let stamp = 0;
  const arrangement = createVersion();
  const rowsIntent = createIntent<true>();

  const pinnedCount = computed(() => own.pinned().length);

  const rowAt = (position: number): T => {
    const node = engine.value.nodeAt(pageStart.value + position);

    if (node?.kind !== TableNodeKind.Row) {
      throw new Error(`NuiTable has no row at position ${position}`);
    }
    return node.row;
  };

  const rowAtPosition = (position: number): T | undefined => {
    const node = engine.value.nodeAt(pageStart.value + position);
    return node?.kind === TableNodeKind.Row ? node.row : undefined;
  };

  const bodyPosition = (row: number): number | undefined => {
    const body = row - pinnedCount.value;
    return body >= 0 && body < visibleRows.value ? pageStart.value + body : undefined;
  };

  const rowFor = (visual: number): T | undefined => {
    if (visual >= 0 && visual < pinnedCount.value) {
      return own.pinned()[visual];
    }
    const position = bodyPosition(visual);
    const node = position === undefined ? undefined : engine.value.nodeAt(position);

    return node?.kind === TableNodeKind.Row ? node.row : undefined;
  };

  const table: TableContext<T> = {
    ...shell,
    loading: () => loadingNow.value,
    engine,
    revision,
    pageStart: () => pageStart.value,
    bodyRows: () => visibleRows.value,
    rowAtPosition,
    rowAt,
    rowFor,
    pinnedRows: () => pinnedCount.value,
  };

  const { grouping, ...groups } = useGroupsArea(table, {
    tree: () => {
      const source = own.source();

      return source === undefined ? own.getChildren() !== undefined : source.children !== undefined;
    },
    detailSlot: own.detailSlot,
    groupBy: own.groupBy,
    expanded: own.expanded,
    leaves: own.leaves,
    treeColumn: own.treeColumn,
    totalsLabel: own.totalsLabel,
    locale: own.locale,
  });

  const { totals, expansion } = groups;

  const pageWindow = computed(() =>
    paginationProps.value === undefined || own.remote()
      ? { start: 0, end: rowCount.value, page: 1, pages: 1 }
      : pageWindowOf(
          rowCount.value,
          own.page.value,
          own.pageSize.value,
          groups.detailPositions.value,
        ),
  );

  const pageStart = computed(() => pageWindow.value.start);

  const visibleRows = computed(() =>
    loadingNow.value ? 0 : pageWindow.value.end - pageWindow.value.start,
  );

  const totalCount = computed(() =>
    own.remote()
      ? (own.total() ?? own.rows().length)
      : rowCount.value - groups.detailPositions.value.length,
  );

  const footRows = computed(() => (totals.enabled.value ? 1 : 0));

  const quickKeys = computed(() => {
    const hidden = own.hidden();

    if (hidden.length === 0) {
      return undefined;
    }
    const hiddenKeys = new Set(hidden);

    return own.leaves().flatMap((column) => (hiddenKeys.has(column.key) ? [] : [column.key]));
  });

  const queryFilters = (): readonly TableFilter[] => {
    const text = own.quick.value.trim();

    return text === ''
      ? own.filters()
      : [...own.filters(), { kind: 'quick', value: text, keys: quickKeys.value }];
  };

  const currentQuery = (): TableQuery => {
    const list = queryFilters();
    const sorting = own.sorting();

    return own.remote()
      ? {}
      : { sort: sorting, filters: list, groupBy: grouping.value, totals: totals.wanted(list) };
  };

  const sync = (): void => {
    rowCount.value = engine.value.count();
    revision.bump();

    if (touched.size === 0) {
      return;
    }

    touched.clear();
  };

  const rearrange = (): void => {
    arrangement.bump();
    sync();
  };

  const query = useTableQuery({
    engine,
    query: currentQuery,
    onSettled: (count, ran) => {
      totals.take(ran);
      rearrange();
      own.clampActive();
      warming.rankSoon((ran.sort ?? []).map((entry) => entry.key));

      if (rowsIntent.take() === true) {
        shell.announce(shell.messages.value.rowsShown({ count }));
      }
      shell.emit('settle', { rows: count });
    },
    onTotals: (ran) => {
      totals.take(ran);
    },
    deferTotals: () => own.source() === undefined,
    onProgress: (progress) => {
      shell.emit('progress', progress);
    },
  });

  const runNow = (): void => {
    totals.take(query.runNow());
  };

  engine.value.setRows(own.rows());
  engine.value.setToggled(own.expanded.value);
  runNow();
  rowCount.value = engine.value.count();

  const warming = useTableWarmup({
    engine,
    columns: own.leaves,
    enabled: () => own.source() === undefined,
  });

  const neededRange = computed(() => {
    if (paginationProps.value !== undefined) {
      const from = waiting.value
        ? (Math.max(1, own.page.value) - 1) * own.pageSize.value
        : pageStart.value;

      return { from, to: Math.max(from + own.pageSize.value, pageWindow.value.end) };
    }
    const range = shell.rowWindow().range.value;

    return { from: pageStart.value + range.start, to: pageStart.value + range.end };
  });

  const ensureRows = (): void => {
    engine.value.ensure(neededRange.value.from, neededRange.value.to);
  };

  const applyChanged = (keys: readonly string[], changed?: readonly T[]): void => {
    totals.reset();

    const ran = currentQuery();

    const moved = engine.value.patch(ran, keys, changed);

    totals.take(ran);

    if (moved) {
      rearrange();
      own.clampActive();
      return;
    }

    sync();
  };

  const queryActive = (): boolean =>
    footRows.value > 0 ||
    own.quick.value !== '' ||
    own.sorting().length > 0 ||
    own.filters().length > 0 ||
    grouping.value.length > 0;

  const revisionOf = (position: number): number => touched.get(position) ?? 0;

  const touchRows = (list: NuiTableRanges): void => {
    const boxes = list.map(boxOf);

    stamp += 1;

    for (const item of shell.rowWindow().items.value) {
      if (!boxes.some((box) => item.index >= box.top && item.index <= box.bottom)) {
        continue;
      }

      touched.set(item.index, stamp);
    }
  };

  const rowsIn = (list: NuiTableRanges): T[] | undefined => {
    const boxes = list.map(boxOf);
    const count = boxes.reduce((sum, box) => sum + box.bottom - box.top + 1, 0);

    if (count > NAMED_ROWS) {
      return undefined;
    }
    return boxes.reduce<T[]>((found, box) => {
      for (let position = box.top; position <= box.bottom; position += 1) {
        const row = rowAtPosition(position);

        if (row === undefined) {
          continue;
        }

        found.push(row);
      }
      return found;
    }, []);
  };

  const invalidate = (list?: NuiTableRanges): void => {
    forgetCellReads();

    if (list === undefined || queryActive()) {
      applyChanged(shell.dataKeys(), list === undefined ? undefined : rowsIn(list));
      return;
    }
    touchRows(list);
  };

  const refresh = (): void => {
    engine.value.refresh();
  };

  const watchSources = (): void => {
    watch(own.quick, () => {
      rowsIntent.set(true);
    });

    watch(pageStart, () => {
      if (!own.windowed()) {
        return;
      }

      shell.rowWindow().scrollTo(0, { align: 'start' });
    });

    watch(own.expandedNow, (ids) => {
      engine.value.setToggled(ids);
      rearrange();
      own.clampActive();
    });

    watch(own.rows, (next) => {
      const places = own.places();
      const held = places.hold();

      engine.value.setRows(next);
      engine.value.setToggled(own.expanded.value);
      expansion.settle();
      totals.reset();

      if (own.getKey() === undefined) {
        own.resetEdits();
      }
      runNow();
      rearrange();
      places.restore(held);
      own.clampActive();
      own.refocusMoved();
      warming.restart();
    });

    watch([own.columns, own.source], () => {
      engine.value.dispose();
      engine.value = createEngine();
      waiting.value = !engine.value.settled();
      engine.value.setRows(own.rows());
      engine.value.setToggled(own.expanded.value);
      own.resetEdits();
      totals.reset();
      runNow();
      rearrange();
      own.clampActive();
      ensureRows();
      warming.restart();
    });

    watch(sourceChanges, () => {
      waiting.value = !engine.value.settled();
      totals.sync();
      sync();
      own.clampActive();
    });

    onMounted(() => {
      watch(neededRange, ensureRows, { immediate: true });
    });
  };

  return {
    ...groups,
    table,
    paginationProps,
    loadingNow,
    rowCount,
    revision,
    arrangement,
    rowsIntent,
    pageStart,
    pinnedCount,
    visibleRows,
    totalCount,
    footRows,
    queryBusy: query.busy,
    sync,
    applyChanged,
    revisionOf,
    invalidate,
    refresh,
    watchSources,
  };
};
