import { VALUES_FIELD, normalizedPivot } from './pivot-engine';
import { pivotCaptions, pivotValueName } from './pivot.messages';
import {
  PivotAggregate,
  PivotArea,
  PivotLayout,
  PivotShowAsKind,
  PivotSort,
  type PivotDefinition,
  type PivotField,
  type PivotFilter,
  type PivotLanguage,
  type PivotPlacement,
  type PivotSource,
  type PivotSpot,
  type PivotValue,
} from './pivot.types';

interface FieldLayout {
  readonly rows: readonly number[];
  readonly columns: readonly number[];
  readonly filters: readonly PivotFilter[];
  readonly values: readonly PivotValue[];
}

type AxisSpot = PivotSpot & { readonly area: Exclude<PivotArea, typeof PivotArea.Values> };

const NORMAL = { kind: PivotShowAsKind.Normal } as const;

const KEPT: PivotField = { order: [], hidden: [], sort: PivotSort.Manual, subtotal: true };

const PLACED: PivotField = { ...KEPT, sort: PivotSort.Ascending };

const fieldsFor = (fields: readonly PivotField[], placed: readonly number[]): PivotField[] => {
  const top = placed.reduce((most, field) => Math.max(most, field), fields.length - 1);

  return Array.from(
    { length: top + 1 },
    (_, field) => fields[field] ?? (placed.includes(field) ? PLACED : KEPT),
  );
};

const layoutOf = (definition: PivotDefinition): FieldLayout => {
  const shown = normalizedPivot(definition);

  return {
    rows: shown.rows,
    columns: shown.columns,
    filters: shown.filters,
    values: shown.values,
  };
};

const settled = (definition: PivotDefinition, layout: FieldLayout): PivotDefinition => {
  const keepsValues = layout.values.length > 1;

  const strip = (fields: readonly number[]): readonly number[] =>
    keepsValues ? fields : fields.filter((field) => field !== VALUES_FIELD);

  const placed = [...layout.rows, ...layout.columns, ...layout.filters.map(({ field }) => field)];

  return {
    ...definition,
    rows: strip(layout.rows),
    columns: strip(layout.columns),
    filters: layout.filters,
    values: layout.values,
    fields: fieldsFor(definition.fields, placed),
  };
};

const axisOf = (layout: FieldLayout, area: AxisSpot['area']): readonly number[] => {
  switch (area) {
    case PivotArea.Rows:
      return layout.rows;
    case PivotArea.Columns:
      return layout.columns;
    case PivotArea.Filters:
      return layout.filters.map((filter) => filter.field);
  }
};

const isAxis = (spot: PivotSpot): spot is AxisSpot => spot.area !== PivotArea.Values;

const withoutAxis = (layout: FieldLayout, field: number): FieldLayout => ({
  ...layout,
  rows: layout.rows.filter((each) => each !== field),
  columns: layout.columns.filter((each) => each !== field),
  filters: layout.filters.filter((filter) => filter.field !== field),
});

const shiftedIndex = (list: readonly number[], field: number, index: number): number => {
  const before = list.indexOf(field);

  return before >= 0 && before < index ? index - 1 : index;
};

const placedAxis = (layout: FieldLayout, field: number, to: AxisSpot): FieldLayout => {
  const at = shiftedIndex(axisOf(layout, to.area), field, to.index);
  const rest = withoutAxis(layout, field);

  switch (to.area) {
    case PivotArea.Rows:
      return { ...rest, rows: rest.rows.toSpliced(at, 0, field) };
    case PivotArea.Columns:
      return { ...rest, columns: rest.columns.toSpliced(at, 0, field) };
    case PivotArea.Filters:
      return { ...rest, filters: rest.filters.toSpliced(at, 0, { field, selected: undefined }) };
  }
};

const uniqueValueName = (values: readonly PivotValue[], name: string): string => {
  const taken = new Set(values.map((value) => value.name.toLowerCase()));
  let candidate = name;

  for (let index = 2; taken.has(candidate.toLowerCase()); index += 1) {
    candidate = `${name}${String(index)}`;
  }
  return candidate;
};

const valueFor = (layout: FieldLayout, field: number, placement: PivotPlacement): PivotValue => {
  const source = placement.fields[field];
  const aggregate = source?.numeric === true ? PivotAggregate.Sum : PivotAggregate.Count;
  const name = pivotValueName(aggregate, source?.name ?? '', placement.language);

  return {
    field,
    aggregate,
    name: uniqueValueName(layout.values, name),
    showAs: NORMAL,
    format: undefined,
  };
};

const withValue = (
  layout: FieldLayout,
  field: number,
  index: number,
  placement: PivotPlacement,
): FieldLayout => ({
  ...layout,
  values: layout.values.toSpliced(index, 0, valueFor(layout, field, placement)),
});

export const emptyPivot = (source: PivotSource, language: PivotLanguage): PivotDefinition => ({
  source,
  rows: [],
  columns: [],
  filters: [],
  values: [],
  fields: [],
  layout: PivotLayout.Compact,
  rowTotals: true,
  columnTotals: true,
  autofit: true,
  captions: pivotCaptions(language),
});

export const pivotAreas = (
  definition: PivotDefinition,
): Readonly<Record<PivotArea, readonly number[]>> => {
  const layout = layoutOf(definition);

  return {
    filters: axisOf(layout, PivotArea.Filters),
    columns: layout.columns,
    rows: layout.rows,
    values: layout.values.map((value) => value.field),
  };
};

export const usedFields = (definition: PivotDefinition): ReadonlySet<number> =>
  new Set(
    [
      ...definition.rows,
      ...definition.columns,
      ...definition.filters.map((filter) => filter.field),
      ...definition.values.map((value) => value.field),
    ].filter((field) => field !== VALUES_FIELD),
  );

export const placeField = (
  definition: PivotDefinition,
  field: number,
  to: PivotSpot,
  placement: PivotPlacement,
): PivotDefinition => {
  const layout = layoutOf(definition);

  return settled(
    definition,
    isAxis(to) ? placedAxis(layout, field, to) : withValue(layout, field, to.index, placement),
  );
};

const movedValue = (
  definition: PivotDefinition,
  layout: FieldLayout,
  from: number,
  to: PivotSpot,
): PivotDefinition => {
  const value = layout.values[from];

  if (value === undefined) {
    return definition;
  }

  const rest = { ...layout, values: layout.values.toSpliced(from, 1) };

  if (isAxis(to)) {
    return settled(definition, placedAxis(rest, value.field, to));
  }

  const at = to.index > from ? to.index - 1 : to.index;

  return settled(definition, { ...rest, values: rest.values.toSpliced(at, 0, value) });
};

export const moveField = (
  definition: PivotDefinition,
  from: PivotSpot,
  to: PivotSpot,
  placement: PivotPlacement,
): PivotDefinition => {
  const layout = layoutOf(definition);

  if (!isAxis(from)) {
    return movedValue(definition, layout, from.index, to);
  }

  const field = axisOf(layout, from.area)[from.index];

  if (field === undefined) {
    return definition;
  }
  if (field === VALUES_FIELD) {
    return to.area === PivotArea.Rows || to.area === PivotArea.Columns
      ? settled(definition, placedAxis(layout, field, { area: to.area, index: to.index }))
      : definition;
  }
  if (!isAxis(to)) {
    return settled(definition, withValue(withoutAxis(layout, field), field, to.index, placement));
  }
  return settled(definition, placedAxis(layout, field, to));
};

export const removeField = (definition: PivotDefinition, spot: PivotSpot): PivotDefinition => {
  const layout = layoutOf(definition);

  if (!isAxis(spot)) {
    return settled(definition, { ...layout, values: layout.values.toSpliced(spot.index, 1) });
  }

  const field = axisOf(layout, spot.area)[spot.index];

  return field === undefined || field === VALUES_FIELD
    ? definition
    : settled(definition, withoutAxis(layout, field));
};

export const checkField = (
  definition: PivotDefinition,
  field: number,
  checked: boolean,
  placement: PivotPlacement,
): PivotDefinition => {
  const layout = layoutOf(definition);

  if (!checked) {
    const rest = withoutAxis(layout, field);

    return settled(definition, {
      ...rest,
      values: rest.values.filter((value) => value.field !== field),
    });
  }
  if (placement.fields[field]?.numeric === true) {
    return settled(definition, withValue(layout, field, layout.values.length, placement));
  }
  return settled(
    definition,
    placedAxis(layout, field, { area: PivotArea.Rows, index: layout.rows.length }),
  );
};
