<template>
  <div
    class="nui-grid"
    :class="[
      `nui-grid--size-${size}`,
      {
        'nui-grid--busy': query.busy.value,
        'nui-grid--totals': totals.enabled.value,
        'nui-grid--auto': !windowed,
      },
    ]"
    :style="rootStyle"
  >
    <div
      :id="gridId"
      ref="viewport"
      class="nui-grid__viewport"
      :role="hierarchical ? 'treegrid' : 'grid'"
      :aria-label="labelText"
      :aria-rowcount="rowCount + headRows + footRows"
      :aria-colcount="layout.visual.length"
      :aria-busy="query.busy.value || undefined"
      @keydown="onKeydown"
      @focusin="focus.onFocusin"
    >
      <div class="nui-grid__header" role="rowgroup" @click="header.onClick">
        <NuiDataGridRow
          v-for="(band, level) in bands.rows"
          :key="level"
          :panes="band"
          :row-index="level + 1"
          part="band"
        >
          <template #default="{ column }">
            <span class="nui-grid__text">{{ bands.labels.get(column) }}</span>
          </template>
        </NuiDataGridRow>
        <NuiDataGridRow
          :panes="panes"
          :row-index="headRows"
          part="head"
          :active="focus.activeIn(-1)"
          :heads="header.heads.value"
        >
          <template #default="{ column }">
            <slot :name="`header-${column}`" v-bind="header.scope(column)">
              <span class="nui-grid__text">{{ columnAt(column).label }}</span>
            </slot>
            <NuiDataGridHeaderMarks
              :state="header.heads.value[column]"
              :hint="header.sortHint(column)"
              :filter-label="messages.filterColumn({ column: columnAt(column).label })"
              :expanded="header.expanded(column)"
              :menu-label="menu.labelOf(column)"
              :menu-expanded="menu.expanded(column)"
              @filter="header.openFilter(column, $event)"
              @menu="header.openMenu(column, $event)"
            />
          </template>
        </NuiDataGridRow>
      </div>
      <div class="nui-grid__body" role="rowgroup" :style="bodyStyle">
        <NuiDataGridRow
          v-for="item in bodyRows"
          :key="item.key"
          :panes="panes"
          :row-index="item.index + headRows + 1"
          :offset="item.offset"
          :active="focus.activeIn(item.index)"
          :revision="item.revision"
          :level="item.level"
          :group="item.group"
          :tree-key="treeKey"
          :expandable="item.expandable"
          :expanded="item.expanded"
          :loading="item.loading"
          @toggle="expansion.toggle(item.index)"
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
      <div v-if="rowCount === 0" class="nui-grid__empty" role="row" :aria-rowindex="headRows + 1">
        <div class="nui-grid__empty-cell" role="gridcell" :aria-colspan="layout.visual.length">
          <slot name="empty">
            <NuiEmpty :title="emptyText" size="sm" />
          </slot>
        </div>
      </div>
      <div v-if="footRows" class="nui-grid__footer" role="rowgroup">
        <NuiDataGridRow
          :panes="panes"
          :row-index="rowCount + headRows + 1"
          part="foot"
          :active="focus.activeIn(rowCount)"
          :revision="revision"
        >
          <template #default="{ column }">
            <slot :name="`footer-${column}`" v-bind="totals.scope(column)">
              <NuiDataGridFooterCell
                :text="totals.scope(column).text"
                :count-text="totals.countText(totals.scope(column).count)"
              />
            </slot>
          </template>
        </NuiDataGridRow>
      </div>
    </div>
    <NuiDataGridFilter
      v-if="header.target.value"
      :key="header.target.value.key"
      v-model:open="header.open.value"
      :title="messages.filterColumn({ column: columnAt(header.target.value.key).label })"
      :kind="header.target.value.kind"
      :column-key="header.target.value.key"
      :filter="header.filterOf(header.target.value.key)"
      :anchor="header.target.value.anchor"
      :locale="resolvedLocale"
      :load-values="loadValues"
      :value-label="valueLabel"
      @apply="header.applyFilter"
    />
    <NuiMenu
      ref="menu-node"
      v-model:open="menu.open.value"
      :anchor="menu.target.value?.anchor ?? null"
      :items="menu.items.value"
      :label="menu.label.value"
    />
    <div v-if="query.busy.value" class="nui-grid__busy" role="presentation"></div>
    <div class="nui-grid__hidden" role="status" aria-live="polite">{{ announcement }}</div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue';
import {
  createIntent,
  useControlId,
  useDirection,
  useLocale,
  useMessages,
  useVirtualList,
} from '@numior/primitives';
import { NuiEmpty, NuiMenu, type NuiMenuExposed } from '@numior/vue';
import {
  createGridEngine,
  type GridDistinct,
  type GridEngine,
  type GridFilter,
  type GridFilterValue,
} from '../engine';
import NuiDataGridRow from './NuiDataGridRow.vue';
import { dataGridMessages } from './data-grid.messages';
import { cellTextOf, cellValueOf, engineColumnOf, valueTextOf } from './grid-format';
import { columnTreeOf, headerBandsOf } from './grid-columns';
import { centreIndexOf, gridLayout, panesOf, pinsFit } from './grid-layout';
import NuiDataGridFilter from './NuiDataGridFilter.vue';
import NuiDataGridFooterCell from './NuiDataGridFooterCell.vue';
import NuiDataGridHeaderMarks from './NuiDataGridHeaderMarks.vue';
import { useGridFocus } from './use-grid-focus';
import { useGridExpansion } from './use-grid-expansion';
import { useGridHeader, type GridHeader } from './use-grid-header';
import { useGridMenu, type GridMenu } from './use-grid-menu';
import { useGridQuery } from './use-grid-query';
import { useGridTotals } from './use-grid-totals';
import type {
  GridCellPosition,
  NuiDataGridCellSlot,
  NuiDataGridEvents,
  NuiDataGridExpanded,
  NuiDataGridExposed,
  NuiDataGridGroupBy,
  NuiDataGridHidden,
  NuiDataGridPins,
  NuiDataGridProps,
  NuiDataGridSlots,
  NuiDataGridFilters,
  NuiDataGridSort,
  NuiGridColumn,
} from './data-grid.types';

const ROW_SIZES = { sm: 32, md: 40, lg: 48 } as const;
const CANVAS_LIMIT = 15_000_000;
const INITIAL_ROWS = 30;
const INITIAL_COLUMNS = 12;
const ROW_OVERSCAN = 6;
const DISTINCT_LIMIT = 100;
const COLUMN_OVERSCAN = 2;

const {
  columns,
  source,
  getKey,
  id,
  size = 'md',
  rowHeight,
  height,
  locale,
  label,
  emptyLabel,
  totalsLabel,
  getChildren,
  hasChildren,
  treeColumn,
  columnMenu = true,
} = defineProps<NuiDataGridProps<T>>();

const sort = defineModel<NuiDataGridSort>('sort', { default: () => [] });
const filters = defineModel<NuiDataGridFilters>('filters', { default: () => [] });
const quick = defineModel<string>('quick', { default: '' });
const groupBy = defineModel<NuiDataGridGroupBy>('groupBy', { default: () => [] });
const expanded = defineModel<NuiDataGridExpanded>('expanded', { default: () => [] });
const pins = defineModel<NuiDataGridPins>('pins', { default: () => ({}) });
const hidden = defineModel<NuiDataGridHidden>('hidden', { default: () => [] });
const emit = defineEmits<NuiDataGridEvents<T>>();
const slots = defineSlots<NuiDataGridSlots<T>>();

const viewport = useTemplateRef<HTMLElement>('viewport');
const tree = computed(() => columnTreeOf(columns));
const gridId = useControlId(() => id);
const resolvedLocale = useLocale(() => locale);
const messages = useMessages(dataGridMessages, resolvedLocale);
const direction = useDirection(viewport);

const createEngine = (): GridEngine<T> =>
  createGridEngine({
    columns: tree.value.leaves.map(engineColumnOf),
    keyOf: getKey,
    children: getChildren,
    hasChildren,
    defaultExpanded: false,
  });

const engine = shallowRef(createEngine());
const rowCount = ref(0);
const revision = ref(0);
const announcement = ref('');
const rowsIntent = createIntent<'rows'>();

const quickKeys = computed(() =>
  hidden.value.length === 0
    ? undefined
    : tree.value.leaves
        .filter((column) => !hidden.value.includes(column.key))
        .map((column) => column.key),
);

const queryFilters = (): readonly GridFilter[] => {
  const text = quick.value.trim();

  return text === ''
    ? filters.value
    : [...filters.value, { kind: 'quick', value: text, keys: quickKeys.value }];
};

const totals = useGridTotals({
  engine,
  columns: () => tree.value.leaves,
  keys: () => layout.value.visual.map((column) => column.key),
  columnAt: (key) => columnAt(key),
  locale: () => resolvedLocale.value,
  messages,
  label: () => totalsLabel,
  rowCount: () => engine.value.rowCount(),
});

const query = useGridQuery({
  engine,
  query: () => {
    const list = queryFilters();

    return {
      sort: sort.value,
      filters: list,
      groupBy: getChildren === undefined ? groupBy.value : [],
      totals: totals.wanted(list),
    };
  },
  onSettled: (rows, ran) => {
    totals.take(ran);
    sync();
    clampActive();

    if (rowsIntent.take() === 'rows') {
      announcement.value = messages.value.rowsShown({ count: rows });
    }
    emit('settle', { rows });
  },
  onProgress: (progress) => {
    emit('progress', progress);
  },
});

const runNow = (): void => {
  totals.take(query.runNow());
};

engine.value.setRows(source);
engine.value.setToggled(expanded.value);
runNow();
rowCount.value = engine.value.count();

const active = ref<GridCellPosition>({ row: rowCount.value > 0 ? 0 : -1, col: 0 });

const room = shallowRef(0);

const pinnedLayout = computed(() =>
  gridLayout(tree.value.leaves, { pins: pins.value, hidden: hidden.value, sticky: true }),
);

const sticky = computed(() => pinsFit(pinnedLayout.value, room.value));

const layout = computed(() =>
  sticky.value
    ? pinnedLayout.value
    : gridLayout(tree.value.leaves, { pins: pins.value, hidden: hidden.value, sticky: false }),
);

const bands = computed(() => headerBandsOf(layout.value, tree.value));
const headRows = computed(() => tree.value.depth + 1);

const columnByKey = computed(
  () => new Map(tree.value.leaves.map((column) => [column.key, column])),
);

const rowSize = computed(() => rowHeight ?? ROW_SIZES[size]);
const windowed = computed(() => height !== undefined);
const labelText = computed(() => label ?? messages.value.label);
const emptyText = computed(() => emptyLabel ?? messages.value.empty);
const booleanTexts = computed(() => ({ yes: messages.value.yes, no: messages.value.no }));
const centreWidths = computed(() => layout.value.centre.map((column) => column.width));

const footRows = computed(() => (totals.enabled.value ? 1 : 0));
const hierarchical = computed(() => groupBy.value.length > 0 || getChildren !== undefined);

const activeRow = (): number | undefined =>
  active.value.row >= 0 && active.value.row < rowCount.value ? active.value.row : undefined;

const activeCentre = (): number | undefined => centreIndexOf(layout.value, active.value.col);

const rows = useVirtualList(viewport, {
  enabled: windowed,
  count: rowCount,
  itemSize: rowSize,
  overscan: ROW_OVERSCAN,
  initialCount: INITIAL_ROWS,
  pinned: activeRow,
  maxSize: CANVAS_LIMIT,
  inset: () => rowSize.value * (headRows.value + footRows.value),
});

const columnWindow = useVirtualList(viewport, {
  enabled: windowed,
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

watch(
  columnWindow.viewport,
  (width) => {
    room.value = width;
  },
  { immediate: true, flush: 'sync' },
);

const panes = computed(() =>
  panesOf(
    layout.value,
    columnWindow.items.value.map((item) => item.index),
  ),
);

const rootStyle = computed(() => ({
  '--_row': `${rowSize.value}px`,
  '--_head-rows': String(headRows.value),
  '--_height': height,
  '--_start': `${layout.value.startWidth}px`,
  '--_centre': `${layout.value.centreWidth}px`,
  '--_end': `${layout.value.endWidth}px`,
}));

const bodyStyle = computed(() =>
  windowed.value ? { blockSize: `${rows.canvasSize.value}px` } : undefined,
);

const focus = useGridFocus({
  viewport,
  active,
  rows,
  columns: columnWindow,
  rowCount: () => rowCount.value + footRows.value,
  bodyRows: () => rowCount.value,
  headRows: () => headRows.value,
  colCount: () => layout.value.visual.length,
  rowSize: () => rowSize.value,
  centreIndexOf: (visual) => centreIndexOf(layout.value, visual),
  columnIndexOf: (key) => layout.value.visual.findIndex((column) => column.key === key),
  isRtl: direction.isRtl,
  windowed: () => windowed.value,
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

const header: GridHeader<T> = useGridHeader({
  keys: () => layout.value.visual.map((column) => column.key),
  keyAt: (visual) => layout.value.visual[visual]?.key,
  columnAt,
  sort,
  filters,
  messages,
  announce: (text) => {
    announcement.value = text;
  },
  filtered: () => {
    rowsIntent.set('rows');
  },
  menu: (key, anchor, focusOn) => menu.openAt(key, anchor, focusOn),
});

const menuNode = useTemplateRef<NuiMenuExposed>('menu-node');

const menu: GridMenu = useGridMenu({
  enabled: () => columnMenu,
  leaves: () => tree.value.leaves,
  layout: () => layout.value,
  columnAt,
  heads: () => header.heads.value,
  sort,
  groupBy,
  pins,
  hidden,
  treeMode: () => getChildren !== undefined,
  messages,
  announce: (text) => {
    announcement.value = text;
  },
  openFilter: (key, anchor) => {
    header.openFilterAt(key, anchor);
  },
  show: (focusOn) => {
    menuNode.value?.show(focusOn);
  },
  refocus: focus.focusHeader,
});

const treeKey = computed(() =>
  getChildren === undefined ? undefined : (treeColumn ?? layout.value.visual[0]?.key),
);

const expansion = useGridExpansion({
  engine,
  expanded,
  revision,
  keys: () => layout.value.visual.map((column) => column.key),
  keyAt: (visual) => layout.value.visual[visual]?.key,
  treeKey: () => treeKey.value,
  columnAt,
  locale: () => resolvedLocale.value,
  messages,
  announce: (text) => {
    announcement.value = text;
  },
  load: (row) => {
    emit('load', row);
  },
});

const bodyRows = computed(() => {
  const current = revision.value;
  const loading = expansion.loading.value;

  return rows.items.value.map((item) => {
    const node = engine.value.nodeAt(item.index);
    const expandable = node?.kind === 'group' || node?.expandable === true;

    return {
      index: item.index,
      offset: windowed.value ? item.offset : undefined,
      key: node?.id ?? item.index,
      revision: current,
      level: hierarchical.value && node !== undefined ? node.level + 1 : undefined,
      group: expansion.rowAt(item.index),
      expandable,
      expanded: expandable ? node?.expanded : undefined,
      loading: node !== undefined && loading.has(node.id),
    };
  });
});

const onKeydown = (event: KeyboardEvent): void => {
  if (!header.onKeydown(event) && !expansion.onKeydown(event, active.value)) {
    focus.onKeydown(event);
  }
};

const loadValues = (): Promise<GridDistinct | null> => {
  const current = header.target.value;

  return current === null
    ? Promise.resolve(null)
    : engine.value.distinct(current.key, { limit: DISTINCT_LIMIT });
};

const valueLabel = (value: GridFilterValue): string => {
  const current = header.target.value;

  const text =
    current === null
      ? ''
      : valueTextOf(
          columnAt(current.key),
          value,
          undefined,
          resolvedLocale.value,
          booleanTexts.value,
        );

  return text === '' ? messages.value.blank : text;
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
  const rowsInFocus = rowCount.value + footRows.value;
  const lastRow = rowsInFocus > 0 ? rowsInFocus - 1 : -1;
  const lastCol = Math.max(0, layout.value.visual.length - 1);
  const row = Math.min(active.value.row, lastRow);
  const col = Math.min(active.value.col, lastCol);

  if (row !== active.value.row || col !== active.value.col) {
    active.value = { row, col };
  }
};

watch(quick, () => {
  rowsIntent.set('rows');
});

watch(
  layout,
  (next, previous) => {
    const key = previous.visual[active.value.col]?.key;
    const index = key === undefined ? -1 : next.visual.findIndex((column) => column.key === key);

    const col =
      index >= 0 ? index : Math.min(active.value.col, Math.max(0, next.visual.length - 1));

    if (col !== active.value.col) {
      active.value = { ...active.value, col };
    }
  },
  { flush: 'sync' },
);

watch(expanded, (ids) => {
  engine.value.setToggled(ids);
  sync();
  clampActive();
});

watch(
  () => source,
  (next) => {
    engine.value.setRows(next);
    engine.value.setToggled(expanded.value);
    expansion.settle();
    totals.reset();
    runNow();
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
    engine.value.setToggled(expanded.value);
    totals.reset();
    runNow();
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
