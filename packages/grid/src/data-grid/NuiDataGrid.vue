<template>
  <div
    class="nui-grid"
    :class="[`nui-grid--size-${size}`, { 'nui-grid--busy': query.busy.value }]"
    :style="rootStyle"
  >
    <div
      :id="gridId"
      ref="viewport"
      class="nui-grid__viewport"
      role="grid"
      :aria-label="labelText"
      :aria-rowcount="rowCount + 1"
      :aria-colcount="layout.visual.length"
      :aria-busy="query.busy.value || undefined"
      @keydown="onKeydown"
      @focusin="focus.onFocusin"
    >
      <div class="nui-grid__header" role="rowgroup" @click="onHeaderClick">
        <NuiDataGridRow
          :panes="panes"
          :row-index="1"
          head
          :active="focus.activeIn(-1)"
          :heads="heads"
        >
          <template #default="{ column }">
            <slot :name="`header-${column}`" v-bind="headerScope(column)">
              <span class="nui-grid__text">{{ columnAt(column).label }}</span>
            </slot>
            <span
              v-if="heads[column]?.sortable"
              class="nui-grid__sort"
              :class="sortClasses(column)"
              aria-hidden="true"
            >
              <NuiIcon :alias="sortIcon(column)" class="nui-grid__sort-icon" />
              <span v-if="heads[column]?.order" class="nui-grid__sort-order">
                {{ heads[column]?.order }}
              </span>
            </span>
            <span v-if="sortHint(column)" class="nui-grid__hidden">{{ sortHint(column) }}</span>
          </template>
        </NuiDataGridRow>
      </div>
      <div class="nui-grid__body" role="rowgroup" :style="bodyStyle">
        <NuiDataGridRow
          v-for="item in rows.items.value"
          :key="keyAt(item.index)"
          :panes="panes"
          :row-index="item.index + 2"
          :offset="item.offset"
          :active="focus.activeIn(item.index)"
          :revision="revision"
        >
          <template #default="{ column }">
            <slot
              v-if="hasCellSlot(column)"
              :name="`cell-${column}`"
              v-bind="cellScope(item.index, column)"
            />
            <span v-else class="nui-grid__text">{{ cellText(item.index, column) }}</span>
          </template>
        </NuiDataGridRow>
      </div>
      <div v-if="rowCount === 0" class="nui-grid__empty" role="row" aria-rowindex="2">
        <div class="nui-grid__empty-cell" role="gridcell" :aria-colspan="layout.visual.length">
          <slot name="empty">
            <NuiEmpty :title="emptyText" size="sm" />
          </slot>
        </div>
      </div>
    </div>
    <div v-if="query.busy.value" class="nui-grid__busy" role="presentation"></div>
    <div class="nui-grid__hidden" role="status" aria-live="polite">{{ announcement }}</div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue';
import {
  useControlId,
  useDirection,
  useLocale,
  useMessages,
  useVirtualList,
} from '@numior/primitives';
import { NuiEmpty, NuiIcon } from '@numior/vue';
import { createGridEngine, type GridEngine, type GridNodeId } from '../engine';
import NuiDataGridRow from './NuiDataGridRow.vue';
import { dataGridMessages } from './data-grid.messages';
import { cellTextOf, cellValueOf, engineColumnOf } from './grid-format';
import { centreIndexOf, gridLayout, panesOf } from './grid-layout';
import { headStates, nextSort } from './grid-sort';
import { useGridFocus } from './use-grid-focus';
import { useGridQuery } from './use-grid-query';
import type {
  GridCellPosition,
  NuiDataGridCellSlot,
  NuiDataGridEvents,
  NuiDataGridExposed,
  NuiDataGridHeaderSlot,
  NuiDataGridProps,
  NuiDataGridSlots,
  NuiDataGridSort,
  NuiGridColumn,
} from './data-grid.types';

const ROW_SIZES = { sm: 32, md: 40, lg: 48 } as const;
const CANVAS_LIMIT = 15_000_000;
const INITIAL_ROWS = 30;
const INITIAL_COLUMNS = 12;
const ROW_OVERSCAN = 6;
const COLUMN_OVERSCAN = 2;

const {
  columns,
  source,
  getKey,
  id,
  size = 'md',
  rowHeight,
  height = '28rem',
  locale,
  label,
  emptyLabel,
} = defineProps<NuiDataGridProps<T>>();

const sort = defineModel<NuiDataGridSort>('sort', { default: () => [] });
const emit = defineEmits<NuiDataGridEvents>();
const slots = defineSlots<NuiDataGridSlots<T>>();

const viewport = useTemplateRef<HTMLElement>('viewport');
const gridId = useControlId(() => id);
const resolvedLocale = useLocale(() => locale);
const messages = useMessages(dataGridMessages, resolvedLocale);
const direction = useDirection(viewport);

const createEngine = (): GridEngine<T> =>
  createGridEngine({ columns: columns.map(engineColumnOf), keyOf: getKey });

const engine = shallowRef(createEngine());
const rowCount = ref(0);
const revision = ref(0);
const announcement = ref('');

const query = useGridQuery({
  engine,
  query: () => ({ sort: sort.value }),
  onSettled: (rows) => {
    sync();
    clampActive();
    emit('settle', { rows });
  },
  onProgress: (progress) => {
    emit('progress', progress);
  },
});

engine.value.setRows(source);
query.runNow();
rowCount.value = engine.value.count();

const active = ref<GridCellPosition>({ row: rowCount.value > 0 ? 0 : -1, col: 0 });

const layout = computed(() => gridLayout(columns));
const columnByKey = computed(() => new Map(columns.map((column) => [column.key, column])));
const rowSize = computed(() => rowHeight ?? ROW_SIZES[size]);
const labelText = computed(() => label ?? messages.value.label);
const emptyText = computed(() => emptyLabel ?? messages.value.empty);
const booleanTexts = computed(() => ({ yes: messages.value.yes, no: messages.value.no }));
const centreWidths = computed(() => layout.value.centre.map((column) => column.width));

const activeRow = (): number | undefined => (active.value.row >= 0 ? active.value.row : undefined);

const activeCentre = (): number | undefined => centreIndexOf(layout.value, active.value.col);

const rows = useVirtualList(viewport, {
  count: rowCount,
  itemSize: rowSize,
  overscan: ROW_OVERSCAN,
  initialCount: INITIAL_ROWS,
  pinned: activeRow,
  maxSize: CANVAS_LIMIT,
  inset: rowSize,
});

const columnWindow = useVirtualList(viewport, {
  axis: 'x',
  count: () => layout.value.centre.length,
  itemSize: () => {
    const widths = centreWidths.value;
    return (index: number) => widths[index] ?? 0;
  },
  overscan: COLUMN_OVERSCAN,
  initialCount: INITIAL_COLUMNS,
  pinned: activeCentre,
  inset: () => layout.value.startWidth + layout.value.endWidth,
});

const panes = computed(() =>
  panesOf(
    layout.value,
    columnWindow.items.value.map((item) => item.index),
  ),
);

const rootStyle = computed(() => ({
  '--_row': `${rowSize.value}px`,
  '--_height': height,
  '--_start': `${layout.value.startWidth}px`,
  '--_centre': `${layout.value.centreWidth}px`,
  '--_end': `${layout.value.endWidth}px`,
}));

const bodyStyle = computed(() => ({ blockSize: `${rows.canvasSize.value}px` }));

const focus = useGridFocus({
  viewport,
  active,
  rows,
  columns: columnWindow,
  rowCount: () => rowCount.value,
  colCount: () => layout.value.visual.length,
  rowSize: () => rowSize.value,
  centreIndexOf: (visual) => centreIndexOf(layout.value, visual),
  isRtl: direction.isRtl,
});

const columnAt = (key: string): NuiGridColumn<T> => {
  const column = columnByKey.value.get(key);

  if (column === undefined) {
    throw new Error(`NuiDataGrid has no column "${key}"`);
  }
  return column;
};

const rowAt = (position: number): T => {
  const node = engine.value.nodeAt(position);

  if (node?.kind !== 'row') {
    throw new Error(`NuiDataGrid has no row at position ${position}`);
  }
  return node.row;
};

const keyAt = (position: number): GridNodeId => engine.value.nodeAt(position)?.id ?? position;

const heads = computed(() =>
  headStates(
    layout.value.visual.map((column) => column.key),
    (key) => columnAt(key).sortable !== false,
    sort.value,
  ),
);

const headerScope = (key: string): NuiDataGridHeaderSlot<T> => ({
  column: columnAt(key),
  direction: heads.value[key]?.direction,
});

const sortClasses = (key: string) => ({
  'nui-grid__sort--active': heads.value[key]?.direction !== undefined,
  'nui-grid__sort--desc': heads.value[key]?.direction === 'desc',
});

const sortIcon = (key: string): 'arrow-up' | 'arrow-up-down' =>
  heads.value[key]?.direction === undefined ? 'arrow-up-down' : 'arrow-up';

const sortHint = (key: string): string => {
  const order = heads.value[key]?.order;
  return order === undefined ? '' : messages.value.sortKey({ order });
};

const announceSort = (key: string, next: NuiDataGridSort): void => {
  const entry = next.find((candidate) => candidate.key === key);
  const column = columnAt(key).label;

  if (entry === undefined) {
    announcement.value = messages.value.sortCleared;
  } else {
    announcement.value =
      entry.direction === 'asc'
        ? messages.value.sortedAscending({ column })
        : messages.value.sortedDescending({ column });
  }
};

const toggleSort = (key: string, multi: boolean): void => {
  if (heads.value[key]?.sortable !== true) {
    return;
  }
  const next = nextSort(sort.value, key, multi);

  sort.value = next;
  announceSort(key, next);
};

const headerKeyOf = (target: EventTarget | null): string | undefined => {
  const cell = target instanceof Element ? target.closest('[role="columnheader"]') : null;
  const visual = Number(cell?.getAttribute('aria-colindex')) - 1;

  return layout.value.visual[visual]?.key;
};

const onHeaderClick = (event: MouseEvent): void => {
  const key = headerKeyOf(event.target);

  if (key !== undefined) {
    toggleSort(key, event.shiftKey);
  }
};

const activatesHeader = (event: KeyboardEvent): boolean =>
  (event.key === 'Enter' || event.key === ' ') &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  event.target instanceof HTMLElement &&
  event.target.matches('[role="columnheader"]');

const onKeydown = (event: KeyboardEvent): void => {
  const key = activatesHeader(event) ? headerKeyOf(event.target) : undefined;

  if (key === undefined) {
    focus.onKeydown(event);
    return;
  }
  event.preventDefault();
  toggleSort(key, event.shiftKey);
};

const hasCellSlot = (key: string): boolean => slots[`cell-${key}`] !== undefined;

const cellText = (position: number, key: string): string =>
  cellTextOf(columnAt(key), rowAt(position), resolvedLocale.value, booleanTexts.value);

const cellScope = (position: number, key: string): NuiDataGridCellSlot<T> => {
  const column = columnAt(key);
  const row = rowAt(position);

  return {
    row,
    column,
    position,
    value: cellValueOf(column, row),
    text: cellTextOf(column, row, resolvedLocale.value, booleanTexts.value),
  };
};

const sync = (): void => {
  rowCount.value = engine.value.count();
  revision.value += 1;
};

const clampActive = (): void => {
  const lastRow = rowCount.value > 0 ? rowCount.value - 1 : -1;
  const lastCol = Math.max(0, layout.value.visual.length - 1);
  const row = Math.min(active.value.row, lastRow);
  const col = Math.min(active.value.col, lastCol);

  if (row !== active.value.row || col !== active.value.col) {
    active.value = { row, col };
  }
};

watch(
  () => source,
  (next) => {
    engine.value.setRows(next);
    query.runNow();
    sync();
    clampActive();
  },
);

watch(
  () => columns,
  () => {
    engine.value.dispose();
    engine.value = createEngine();
    engine.value.setRows(source);
    query.runNow();
    sync();
    clampActive();
  },
);

defineExpose<NuiDataGridExposed>({
  scrollToRow: (position) => {
    rows.scrollTo(position, { align: 'start' });
  },
  scrollToColumn: (key) => {
    const index = layout.value.centre.findIndex((column) => column.key === key);

    if (index >= 0) {
      columnWindow.scrollTo(index, { align: 'start' });
    }
  },
});
</script>
