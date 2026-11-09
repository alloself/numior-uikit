import {
  anyOf,
  isBoolean,
  isNumber,
  isString,
  listOf,
  oneOf,
  optional,
  shapeOf,
  type Guard,
} from '@numior/primitives/guards';
import { LineAxis } from '../cell.types';
import {
  DrawingAnchorKind,
  DrawingKind,
  DrawingPlacement,
  SheetChartGaps,
  SheetChartKind,
  SheetChartStacking,
  type DrawingAnchor,
  type DrawingMark,
  type SheetChart,
  type SheetChartSeries,
} from '../drawings/drawing.types';
import {
  FragmentSlotKind,
  MeasureName,
  SlotPolicy,
  type Fragment,
  type FragmentPiece,
  type FragmentSlot,
  type PartXml,
  type SheetXml,
} from '../layout/fragments.types';
import type { SheetDefaults, SheetView } from '../layout/layout.types';
import { isDecoration } from './wire-styles';
import { byKind, isAddress, isCount, isFormula, isRange, lazy } from './wire-values';
import type {
  WireDrawing,
  WireDrawingContent,
  WireLayout,
  WireLine,
  WireLines,
} from './wire.types';

const isExtraPair: Guard<readonly [name: string, value: string]> = (
  value,
): value is readonly [name: string, value: string] =>
  Array.isArray(value) && value.length === 2 && isString(value[0]) && isString(value[1]);

const isLine: Guard<WireLine> = shapeOf({
  size: optional(isNumber),
  custom: isBoolean,
  hidden: isBoolean,
  level: isCount,
  collapsed: isBoolean,
  style: optional(shapeOf({ format: isString, decoration: isDecoration })),
  extra: listOf(isExtraPair),
});

const isLineEntry: Guard<WireLines[number]> = (value): value is WireLines[number] =>
  Array.isArray(value) && value.length === 2 && isCount(value[0]) && isLine(value[1]);

const isView: Guard<SheetView> = shapeOf({
  frozenRows: isCount,
  frozenCols: isCount,
  gridlines: isBoolean,
  rightToLeft: isBoolean,
  zoom: isNumber,
});

const isDefaults: Guard<SheetDefaults> = shapeOf({
  rowHeight: optional(isNumber),
  colWidth: optional(isNumber),
  baseColWidth: isNumber,
});

const isPolicy = oneOf(...Object.values(SlotPolicy));

const isAxis = oneOf(...Object.values(LineAxis));

const isSlot: Guard<FragmentSlot> = byKind({
  [FragmentSlotKind.Cell]: shapeOf({
    kind: oneOf(FragmentSlotKind.Cell),
    cell: isAddress,
    policy: isPolicy,
  }),
  [FragmentSlotKind.Ranges]: shapeOf({
    kind: oneOf(FragmentSlotKind.Ranges),
    ranges: listOf(isRange),
    policy: isPolicy,
  }),
  [FragmentSlotKind.Line]: shapeOf({
    kind: oneOf(FragmentSlotKind.Line),
    axis: isAxis,
    line: isCount,
    base: isCount,
    policy: isPolicy,
  }),
  [FragmentSlotKind.Split]: shapeOf({
    kind: oneOf(FragmentSlotKind.Split),
    axis: isAxis,
    count: isCount,
  }),
  [FragmentSlotKind.Offset]: shapeOf({ kind: oneOf(FragmentSlotKind.Offset), offset: isNumber }),
  [FragmentSlotKind.Measure]: shapeOf({
    kind: oneOf(FragmentSlotKind.Measure),
    name: oneOf(...Object.values(MeasureName)),
    value: isNumber,
  }),
  [FragmentSlotKind.Formula]: shapeOf({ kind: oneOf(FragmentSlotKind.Formula), ast: isFormula }),
  [FragmentSlotKind.Count]: shapeOf({ kind: oneOf(FragmentSlotKind.Count) }),
});

const isPiece: Guard<FragmentPiece> = anyOf(
  isString,
  isSlot,
  lazy(() => isFragment),
);

const isFragment: Guard<Fragment> = shapeOf({ pieces: listOf(isPiece), group: isBoolean });

const isSheetXml: Guard<SheetXml> = shapeOf({
  head: isFragment,
  tail: isFragment,
  opaque: listOf(isString),
});

const isPartXml: Guard<PartXml> = shapeOf({
  path: isString,
  root: isFragment,
  opaque: listOf(isString),
});

const isMark: Guard<DrawingMark> = shapeOf({
  row: isCount,
  col: isCount,
  dx: isNumber,
  dy: isNumber,
});

const isAnchor: Guard<DrawingAnchor> = byKind({
  [DrawingAnchorKind.Cells]: shapeOf({
    kind: oneOf(DrawingAnchorKind.Cells),
    placement: oneOf(...Object.values(DrawingPlacement)),
    from: isMark,
    to: isMark,
  }),
  [DrawingAnchorKind.Cell]: shapeOf({
    kind: oneOf(DrawingAnchorKind.Cell),
    from: isMark,
    width: isNumber,
    height: isNumber,
  }),
  [DrawingAnchorKind.Point]: shapeOf({
    kind: oneOf(DrawingAnchorKind.Point),
    x: isNumber,
    y: isNumber,
    width: isNumber,
    height: isNumber,
  }),
});

const isSeries: Guard<SheetChartSeries> = shapeOf({
  name: optional(anyOf(isFormula, isString)),
  categories: optional(isFormula),
  values: optional(isFormula),
});

const isChart: Guard<SheetChart> = shapeOf({
  kind: oneOf(...Object.values(SheetChartKind)),
  title: optional(isString),
  legend: isBoolean,
  stacking: oneOf(...Object.values(SheetChartStacking)),
  gaps: oneOf(...Object.values(SheetChartGaps)),
  hole: optional(isNumber),
  series: listOf(isSeries),
});

const isDrawingContent: Guard<WireDrawingContent> = byKind({
  [DrawingKind.Picture]: shapeOf({
    kind: oneOf(DrawingKind.Picture),
    media: isString,
    type: isString,
    bytes: isString,
  }),
  [DrawingKind.Chart]: shapeOf({
    kind: oneOf(DrawingKind.Chart),
    chart: isChart,
    part: optional(isString),
    rewrite: optional(isBoolean),
  }),
  [DrawingKind.Foreign]: shapeOf({ kind: oneOf(DrawingKind.Foreign), label: isString }),
});

const isDrawing: Guard<WireDrawing> = shapeOf({
  id: isString,
  name: isString,
  alt: isString,
  anchor: isAnchor,
  content: isDrawingContent,
  source: optional(shapeOf({ part: isString, anchor: isCount })),
});

export const isWireLayout: Guard<WireLayout> = shapeOf({
  rows: listOf(isLineEntry),
  cols: listOf(isLineEntry),
  merges: listOf(isRange),
  view: isView,
  defaults: isDefaults,
  xml: optional(isSheetXml),
  parts: listOf(isPartXml),
  drawings: listOf(isDrawing),
});
