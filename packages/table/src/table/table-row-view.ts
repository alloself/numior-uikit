import { normalizeClass } from 'vue';
import { ReorderAxis } from '@numior/primitives';
import { TableSortDirection } from '../engine';
import { inSpans } from './table-ranges';
import {
  NuiTablePin,
  TableCellSpanKind,
  TablePlacementKind,
  TableRowPart,
  type NuiTableResizerProps,
  type TableCellLayout,
  type TableCellPaint,
  type TableCellSpan,
  type TableRowCell,
  type TableDataCell,
  type TableGapCell,
  type TableRowGap,
  type TableHeadState,
  type TableLeadSpan,
  type TableRangeSegment,
  type TableRowCellView,
  type TableRowPaint,
  type TableRowRanges,
  type TableRowRead,
  type TableRowSpan,
} from './table.types';

const CELL = 'nui-table__cell';

const flag = (on: boolean, name: string): string => (on ? ` ${name}` : '');

const overOne = (count: number): number | undefined => (count > 1 ? count : undefined);

const rowspanOf = (lead: TableLeadSpan | undefined): number | undefined =>
  overOne(lead?.rowspan ?? 1);

const colspanOf = (cell: TableDataCell, lead: TableLeadSpan | undefined): number | undefined =>
  overOne(lead?.colspan ?? cell.colspan);

const colSpanOf = (cell: TableDataCell, lead: TableLeadSpan | undefined): number | undefined =>
  lead?.span ?? cell.span;

const leadIn = (span: TableCellSpan | undefined): TableLeadSpan | undefined =>
  span?.kind === TableCellSpanKind.Lead ? span : undefined;

const pinClass = (cell: TableCellLayout): string =>
  flag(cell.pin === NuiTablePin.Start, 'nui-table__cell--pin-start') +
  flag(cell.pin === NuiTablePin.End, 'nui-table__cell--pin-end') +
  flag(cell.edge, 'nui-table__cell--edge');

const hitsIn = (segments: TableRowRanges | undefined, visual: number): TableRangeSegment[] =>
  segments === undefined
    ? []
    : segments.filter((segment) => visual >= segment.from && visual <= segment.to);

const touches = (segments: TableRowRanges | undefined, from: number, to: number): boolean =>
  segments?.some((segment) => segment.from <= to && segment.to >= from) === true;

const coversAll = (segments: TableRowRanges | undefined, from: number, to: number): boolean => {
  for (let col = from; col <= to; col += 1) {
    if (hitsIn(segments, col).length === 0) {
      return false;
    }
  }
  return true;
};

const leadRangeClass = (
  lead: TableLeadSpan,
  visual: number,
  read: TableRowRead,
): string | undefined => {
  const top = read.position ?? lead.row;
  const last = visual + lead.span - 1;
  const rows = Array.from({ length: lead.rowspan }, (_, index) => read.rangedAt?.(top + index));

  if (!rows.some((segments) => touches(segments, visual, last))) {
    return undefined;
  }
  return (
    ' nui-table__cell--ranged' +
    flag(!coversAll(read.rangedAt?.(top - 1), visual, last), 'nui-table__cell--range-top') +
    flag(
      !coversAll(read.rangedAt?.(top + lead.rowspan), visual, last),
      'nui-table__cell--range-bottom',
    ) +
    flag(
      rows.some((segments) => !coversAll(segments, visual - 1, visual - 1)),
      'nui-table__cell--range-start',
    ) +
    flag(
      rows.some((segments) => !coversAll(segments, last + 1, last + 1)),
      'nui-table__cell--range-end',
    )
  );
};

const plainRangeClass = (cell: TableDataCell, read: TableRowRead): string | undefined => {
  const visual = cell.colIndex - 1;
  const hits = cell.kind === TablePlacementKind.Data ? hitsIn(read.ranged, visual) : [];

  if (hits.length === 0) {
    return undefined;
  }
  return (
    ' nui-table__cell--ranged' +
    flag(
      hits.some((segment) => segment.top),
      'nui-table__cell--range-top',
    ) +
    flag(
      hits.some((segment) => segment.bottom),
      'nui-table__cell--range-bottom',
    ) +
    flag(
      hits.some((segment) => segment.start && segment.from === visual),
      'nui-table__cell--range-start',
    ) +
    flag(
      hits.some((segment) => segment.end && segment.to === visual),
      'nui-table__cell--range-end',
    )
  );
};

const rangeClass = (
  cell: TableDataCell,
  lead: TableLeadSpan | undefined,
  read: TableRowRead,
): string | undefined => {
  const merged = cell.kind === TablePlacementKind.Data ? lead : undefined;

  return merged === undefined
    ? plainRangeClass(cell, read)
    : leadRangeClass(merged, cell.colIndex - 1, read);
};

const mergeClass = (
  cell: TableDataCell,
  span: TableLeadSpan | undefined,
  read: TableRowRead,
): string => {
  if (span === undefined) {
    return '';
  }

  const allied =
    span.anchor.row === read.ally?.row &&
    span.anchor.col === read.ally.col &&
    cell.colIndex !== read.active;

  return (
    ' nui-table__cell--merged' +
    flag(span.edge, 'nui-table__cell--edge') +
    flag(span.tail, 'nui-table__cell--tail') +
    flag(span.rows > 1, 'nui-table__cell--tall') +
    flag(allied, 'nui-table__cell--allied') +
    flag(span.row > span.anchor.row, 'nui-table__cell--cut-top') +
    flag(span.row + span.rowspan < span.anchor.row + span.rows, 'nui-table__cell--cut-bottom') +
    flag(span.col > span.anchor.col, 'nui-table__cell--cut-start') +
    flag(span.col + span.span < span.anchor.col + span.cols, 'nui-table__cell--cut-end')
  );
};

const markedOf = (cell: TableDataCell, read: TableRowRead): boolean =>
  cell.kind === TablePlacementKind.Rowhead
    ? read.ranged !== undefined
    : read.marks !== undefined && inSpans(read.marks, cell.colIndex - 1);

const paintClass = (paint: TableCellPaint | undefined): string => {
  const text = paint === undefined ? '' : normalizeClass(paint.class);

  return text === '' ? '' : ` ${text}`;
};

const baseClass = (cell: TableDataCell, paint: TableCellPaint | undefined): string =>
  `${CELL} ${CELL}--align-${paint?.align ?? cell.align} ${CELL}--${cell.kind}` +
  paintClass(paint) +
  pinClass(cell) +
  (cell.rule === undefined ? '' : ` nui-table__cell--rule-${cell.rule}`);

const stateClass = (cell: TableDataCell, read: TableRowRead): string =>
  flag(markedOf(cell, read), 'nui-table__cell--marked') +
  flag(cell.tail === true, 'nui-table__cell--tail') +
  flag(cell.wrap && read.wrapsText, 'nui-table__cell--wrap') +
  flag(cell.colIndex === read.active, 'nui-table__cell--active');

const headClass = (state: TableHeadState | undefined): string =>
  flag(state?.sortable === true, 'nui-table__cell--sortable') +
  flag(state?.dragging === true, 'nui-table__cell--dragging');

const spreadOf = (span: TableLeadSpan | undefined): Record<string, string> | undefined => {
  if (span === undefined) {
    return undefined;
  }
  return {
    ...(span.span === span.cols
      ? {}
      : { '--_span-x': `${-span.x}px`, '--_span-w': `${span.width}px` }),
    ...(span.rowspan === span.rows
      ? {}
      : { '--_span-y': `${-span.y}px`, '--_span-h': `${span.height}px` }),
  };
};

const styleOf = (
  cell: TableDataCell,
  lead: TableLeadSpan | undefined,
  paint: TableCellPaint | undefined,
): unknown => {
  const painted = paint?.style;
  const spread = spreadOf(lead);

  return painted === undefined && spread === undefined ? cell.style : [cell.style, painted, spread];
};

const tagOf = (cell: TableCellLayout, read: TableRowRead): 'th' | 'td' =>
  read.heading || cell.kind === TablePlacementKind.Rowhead ? 'th' : 'td';

const roleOf = (
  cell: TableDataCell,
  read: TableRowRead,
): 'columnheader' | 'rowheader' | 'gridcell' => {
  if (read.heading) {
    return 'columnheader';
  }
  return cell.kind === TablePlacementKind.Rowhead ? 'rowheader' : 'gridcell';
};

const scopeOf = (
  cell: TableDataCell,
  read: TableRowRead,
): 'col' | 'colgroup' | 'row' | undefined => {
  if (read.heading) {
    return read.part === TableRowPart.Head ? 'col' : 'colgroup';
  }
  return cell.kind === TablePlacementKind.Rowhead ? 'row' : undefined;
};

const resizerOf = (
  cell: TableDataCell,
  handle: string,
  read: TableRowRead,
): NuiTableResizerProps | undefined => {
  if (cell.kind === TablePlacementKind.Rowhead) {
    return read.sizable ? { axis: ReorderAxis.Y, active: read.sizing } : undefined;
  }

  const state = read.heading ? read.head?.(handle) : undefined;

  return state?.resizable === true
    ? { start: cell.pin === NuiTablePin.End, active: state.resizing }
    : undefined;
};

const tabindexOf = (colIndex: number, read: TableRowRead): number | undefined => {
  if (read.part === TableRowPart.Band || read.part === TableRowPart.Skeleton) {
    return undefined;
  }
  return colIndex === read.active ? 0 : -1;
};

const sortOf = (state: TableHeadState | undefined): 'ascending' | 'descending' | undefined => {
  if (state?.primary !== true) {
    return undefined;
  }
  return state.direction === TableSortDirection.Desc ? 'descending' : 'ascending';
};

const pieceClassOf = (spill: string | undefined): string =>
  spill === undefined ? 'nui-table__text' : 'nui-table__spill';

const hiddenOf = (spill: string | undefined): 'true' | undefined =>
  spill === undefined ? undefined : 'true';

const bareOf = (
  paint: TableCellPaint | undefined,
  plain: string | undefined,
): string | undefined => (paint?.flows === true ? undefined : plain);

const slotOf = (cell: TableDataCell): 'default' | 'utility' =>
  cell.kind === TablePlacementKind.Data ? 'default' : 'utility';

const classOf = (
  cell: TableDataCell,
  paint: TableCellPaint | undefined,
  lead: TableLeadSpan | undefined,
  range: string | undefined,
  read: TableRowRead,
): string =>
  baseClass(cell, paint) + (range ?? '') + mergeClass(cell, lead, read) + stateClass(cell, read);

const gapView = (cell: TableGapCell, read: TableRowRead): TableRowGap => ({
  gap: true,
  key: cell.key,
  tag: tagOf(cell, read),
  className: `${CELL} ${CELL}--gap${pinClass(cell)}`,
  colspan: overOne(cell.colspan),
  style: cell.style,
});

const cellView = (
  cell: TableDataCell,
  lead: TableLeadSpan | undefined,
  read: TableRowRead,
): TableRowCell => {
  const paint = read.paints?.get(cell.key);
  const state = read.head?.(cell.key);
  const range = rangeClass(cell, lead, read);
  const plain = read.plain?.get(cell.key);
  const spill = paint?.spill;
  const handle = cell.handle ?? cell.key;

  return {
    gap: false,
    key: cell.key,
    handle,
    tag: tagOf(cell, read),
    className: classOf(cell, paint, lead, range, read) + headClass(state),
    role: roleOf(cell, read),
    scope: scopeOf(cell, read),
    rowspan: rowspanOf(lead),
    colspan: colspanOf(cell, lead),
    colIndex: cell.colIndex,
    colSpan: colSpanOf(cell, lead),
    sort: sortOf(state),
    selected: range === undefined ? undefined : 'true',
    tabindex: tabindexOf(cell.colIndex, read),
    style: styleOf(cell, lead, paint),
    bare: bareOf(paint, plain),
    piece: spill ?? plain,
    pieceClass: pieceClassOf(spill),
    pieceHidden: hiddenOf(spill),
    slot: slotOf(cell),
    merge: lead,
    icon: paint?.icon,
    resizer: resizerOf(cell, handle, read),
  };
};

export const rowCellViews = (
  cells: readonly TableCellLayout[],
  spans: TableRowSpan | undefined,
  read: TableRowRead,
): TableRowCellView[] =>
  cells.reduce<TableRowCellView[]>((views, cell) => {
    const span = spans?.get(cell.key);

    if (span?.kind === TableCellSpanKind.Covered) {
      return views;
    }

    views.push(
      cell.kind === TablePlacementKind.Gap
        ? gapView(cell, read)
        : cellView(cell, leadIn(span), read),
    );

    return views;
  }, []);

export const rowPlainTexts = (
  cells: readonly TableCellLayout[],
  spans: TableRowSpan | undefined,
  paints: TableRowPaint | undefined,
  text: (key: string) => string | undefined,
): ReadonlyMap<string, string> =>
  cells.reduce((texts, cell) => {
    const span = spans?.get(cell.key);

    const shown =
      cell.kind === TablePlacementKind.Data &&
      span === undefined &&
      paints?.get(cell.key)?.icon === undefined;

    const found = shown ? text(cell.key) : undefined;

    if (found === undefined) {
      return texts;
    }
    texts.set(cell.key, found);

    return texts;
  }, new Map<string, string>());
