import {
  anyOf,
  isBoolean,
  isString,
  listOf,
  oneOf,
  optional,
  shapeOf,
  type Guard,
} from '@numior/primitives/guards';
import {
  PivotAggregate,
  PivotBaseStep,
  PivotLayout,
  PivotShowAsKind,
  PivotSort,
  PivotSourceKind,
  type PivotCaptions,
  type PivotDefinition,
  type PivotField,
  type PivotFilter,
  type PivotShowAs,
  type PivotSource,
  type PivotSpec,
  type PivotState,
  type PivotValue,
} from '../pivot/pivot.types';
import { byKind, isAddress, isCellValue, isCount, isRange } from './wire-values';

const isPivotSource: Guard<PivotSource> = byKind({
  [PivotSourceKind.Range]: shapeOf({
    kind: oneOf(PivotSourceKind.Range),
    sheet: isString,
    range: isRange,
  }),
  [PivotSourceKind.Table]: shapeOf({ kind: oneOf(PivotSourceKind.Table), name: isString }),
  [PivotSourceKind.Lost]: shapeOf({ kind: oneOf(PivotSourceKind.Lost) }),
});

const isShowAs: Guard<PivotShowAs> = anyOf(
  shapeOf({
    kind: oneOf(
      PivotShowAsKind.Normal,
      PivotShowAsKind.PercentOfTotal,
      PivotShowAsKind.PercentOfRow,
      PivotShowAsKind.PercentOfCol,
      PivotShowAsKind.Index,
    ),
  }),
  shapeOf({ kind: oneOf(PivotShowAsKind.RunTotal), field: isCount }),
  shapeOf({
    kind: oneOf(PivotShowAsKind.Difference, PivotShowAsKind.Percent, PivotShowAsKind.PercentDiff),
    field: isCount,
    item: anyOf(oneOf(...Object.values(PivotBaseStep)), isCellValue),
  }),
);

const isPivotValue: Guard<PivotValue> = shapeOf({
  field: isCount,
  aggregate: oneOf(...Object.values(PivotAggregate)),
  name: isString,
  showAs: isShowAs,
  format: optional(isString),
});

const isPivotField: Guard<PivotField> = shapeOf({
  order: listOf(isCellValue),
  hidden: listOf(isCellValue),
  sort: oneOf(...Object.values(PivotSort)),
  subtotal: isBoolean,
});

const isPivotFilter: Guard<PivotFilter> = shapeOf({
  field: isCount,
  selected: optional(isCellValue),
});

const isCaptions: Guard<PivotCaptions> = shapeOf({
  rows: isString,
  columns: isString,
  values: isString,
  total: isString,
  grandTotal: isString,
  blank: isString,
  all: isString,
  multiple: isString,
});

const isDefinition: Guard<PivotDefinition> = shapeOf({
  source: isPivotSource,
  rows: listOf(isCount),
  columns: listOf(isCount),
  filters: listOf(isPivotFilter),
  values: listOf(isPivotValue),
  fields: listOf(isPivotField),
  layout: oneOf(...Object.values(PivotLayout)),
  rowTotals: isBoolean,
  columnTotals: isBoolean,
  autofit: isBoolean,
  captions: isCaptions,
});

export const isPivotSpec: Guard<PivotSpec> = shapeOf({
  anchor: isAddress,
  definition: isDefinition,
});

export const isPivotState: Guard<PivotState> = shapeOf({
  anchor: isAddress,
  definition: isDefinition,
  footprint: optional(isRange),
});
