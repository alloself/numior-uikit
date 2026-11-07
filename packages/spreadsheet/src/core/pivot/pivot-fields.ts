import type { CellValue } from '../cell.types';
import type { Workbook } from '../workbook';
import { buildPivotCache, pivotKey, pivotSource } from './pivot-cache';
import { itemOrder, pivotFieldOf } from './pivot-engine';
import type { PivotDefinition, PivotField, PivotSort, PivotValue } from './pivot.types';

const withField = (
  definition: PivotDefinition,
  field: number,
  change: Partial<PivotField>,
): PivotDefinition => {
  const length = Math.max(definition.fields.length, field + 1);

  return {
    ...definition,
    fields: Array.from({ length }, (_, index) =>
      index === field
        ? { ...pivotFieldOf(definition, index), ...change }
        : pivotFieldOf(definition, index),
    ),
  };
};

export const pivotFieldItems = (
  book: Workbook,
  definition: PivotDefinition,
  field: number,
): readonly CellValue[] | undefined => {
  const source = pivotSource(book, definition.source);
  const items = source === undefined ? undefined : buildPivotCache(source)?.group(field)?.items;

  if (items === undefined) {
    return undefined;
  }

  const settings = { ...pivotFieldOf(definition, field), hidden: [] };

  return itemOrder(settings, items).reduce<CellValue[]>((ordered, index) => {
    const item = items[index];

    if (item !== undefined) {
      ordered.push(item);
    }
    return ordered;
  }, []);
};

export const shownItems = (
  definition: PivotDefinition,
  field: number,
  items: readonly CellValue[],
): readonly CellValue[] => {
  const filter = definition.filters.find((each) => each.field === field);
  const picked = filter?.selected;

  if (picked !== undefined) {
    const key = pivotKey(picked);

    return items.filter((item) => pivotKey(item) === key);
  }

  const hidden = new Set(pivotFieldOf(definition, field).hidden.map(pivotKey));

  return items.filter((item) => !hidden.has(pivotKey(item)));
};

export const sortField = (
  definition: PivotDefinition,
  field: number,
  sort: PivotSort,
): PivotDefinition => withField(definition, field, { sort });

export const showSubtotals = (
  definition: PivotDefinition,
  field: number,
  subtotal: boolean,
): PivotDefinition => withField(definition, field, { subtotal });

export const showItems = (
  definition: PivotDefinition,
  field: number,
  shown: readonly CellValue[],
  items: readonly CellValue[],
): PivotDefinition => {
  const kept = new Set(shown.map(pivotKey));
  const hidden = items.filter((item) => !kept.has(pivotKey(item)));
  const single = shown.length === 1 && hidden.length > 0 ? shown[0] : undefined;

  const filters = definition.filters.map((filter) =>
    filter.field === field ? { field, selected: single } : filter,
  );

  const filtered = filters.some((filter) => filter.field === field);

  return withField({ ...definition, filters }, field, {
    hidden: filtered && single !== undefined ? [] : hidden,
  });
};

export const setPivotValue = (
  definition: PivotDefinition,
  index: number,
  value: PivotValue,
): PivotDefinition => ({
  ...definition,
  values: definition.values.map((each, at) => (at === index ? value : each)),
});
