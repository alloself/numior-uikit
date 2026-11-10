import { describe, expect, it } from 'vite-plus/test';
import {
  checkField,
  emptyPivot,
  pivotFieldItems,
  pivotFieldOf,
  placeField,
  setPivotValue,
  showItems,
  showSubtotals,
  shownItems,
  sortField,
  PivotShowAsKind,
  pivotKey,
  type CellValue,
  type PivotPlacement,
  type PivotValue,
} from '../src/core';
import {
  baseItemKey,
  pivotNameError,
  pivotValueForm,
  pivotValueOf,
  withAggregate,
} from '../src/sheet/pivot/pivot-value-form';
import { openBook } from './book-harness';

const PLACEMENT: PivotPlacement = {
  fields: [
    { name: 'Region', numeric: false },
    { name: 'City', numeric: false },
    { name: 'Sales', numeric: true },
  ],
  language: 'en',
};

const ROWS = [
  ['Region', 'City', 'Sales'],
  ['West', 'Oslo', '10'],
  ['East', 'Tver', '20'],
  ['North', 'Oslo', '30'],
];

const text = (value: string): CellValue => ({ kind: 'string', value });

const labels = (items: readonly CellValue[] | undefined): string[] =>
  (items ?? []).map((item) => (item.kind === 'string' ? item.value : item.kind));

const salesBook = () => {
  const sheet = openBook();

  ROWS.forEach((row, at) => {
    row.forEach((value, col) => {
      sheet.type(`${'ABC'[col] ?? 'A'}${String(at + 1)}`, value);
    });
  });

  const source = emptyPivot(
    { kind: 'range', sheet: 'Sheet1', range: { top: 0, left: 0, bottom: 3, right: 2 } },
    'en',
  );

  return {
    sheet,
    book: sheet.book,
    definition: checkField(checkField(source, 0, true, PLACEMENT), 2, true, PLACEMENT),
  };
};

describe('pivot field items', () => {
  it('sorts a newly placed axis field ascending and lists its items in that order', () => {
    const { book, definition } = salesBook();

    expect(pivotFieldOf(definition, 0).sort).toBe('ascending');
    expect(pivotFieldOf(definition, 2).sort).toBe('manual');
    expect(labels(pivotFieldItems(book, definition, 0))).toEqual(['East', 'North', 'West']);

    const descending = sortField(definition, 0, 'descending');

    expect(labels(pivotFieldItems(book, descending, 0))).toEqual(['West', 'North', 'East']);

    expect(labels(pivotFieldItems(book, sortField(definition, 0, 'manual'), 0))).toEqual([
      'West',
      'East',
      'North',
    ]);
  });

  it('lists the items anew after the source changes, the change is undone or a line leaves it', () => {
    const { sheet, book, definition } = salesBook();

    expect(labels(pivotFieldItems(book, definition, 0))).toEqual(['East', 'North', 'West']);

    sheet.type('A2', 'South');

    expect(labels(pivotFieldItems(book, definition, 0))).toEqual(['East', 'North', 'South']);

    sheet.history.undo();

    expect(labels(pivotFieldItems(book, definition, 0))).toEqual(['East', 'North', 'West']);

    sheet.remove('4');

    expect(labels(pivotFieldItems(book, definition, 0))).not.toContain('North');
  });

  it('hides the unchecked items of a row field and still lists them', () => {
    const { book, definition } = salesBook();
    const items = pivotFieldItems(book, definition, 0) ?? [];

    const shown = showItems(definition, 0, [text('East'), text('West')], items);

    expect(labels(pivotFieldOf(shown, 0).hidden)).toEqual(['North']);
    expect(labels(shownItems(shown, 0, items))).toEqual(['East', 'West']);
    expect(labels(pivotFieldItems(book, shown, 0))).toEqual(['East', 'North', 'West']);
  });

  it('selects a single filter item and hides several unchecked ones', () => {
    const { book, definition } = salesBook();
    const filtered = placeField(definition, 1, { area: 'filters', index: 0 }, PLACEMENT);
    const items = pivotFieldItems(book, filtered, 1) ?? [];

    const single = showItems(filtered, 1, [text('Tver')], items);

    expect(single.filters).toEqual([{ field: 1, selected: text('Tver') }]);
    expect(pivotFieldOf(single, 1).hidden).toEqual([]);
    expect(labels(shownItems(single, 1, items))).toEqual(['Tver']);

    const all = showItems(single, 1, items, items);

    expect(all.filters).toEqual([{ field: 1, selected: undefined }]);
    expect(pivotFieldOf(all, 1).hidden).toEqual([]);
  });

  it('turns subtotals off and replaces a value', () => {
    const { definition } = salesBook();

    expect(pivotFieldOf(showSubtotals(definition, 0, false), 0).subtotal).toBe(false);

    const value = definition.values[0];

    expect(value?.name).toBe('Sum of Sales');

    const renamed =
      value === undefined
        ? definition
        : setPivotValue(definition, 0, { ...value, name: 'Revenue', aggregate: 'max' });

    expect(renamed.values).toMatchObject([{ name: 'Revenue', aggregate: 'max', field: 2 }]);
  });
});

describe('pivot value form', () => {
  const SALES: PivotValue = {
    field: 2,
    aggregate: 'sum',
    name: 'Sum of Sales',
    showAs: { kind: 'normal' },
    format: undefined,
  };

  const ITEMS = [text('East'), text('West')].map((value) => ({
    key: pivotKey(value),
    value,
    label: labels([value]).join(''),
  }));

  it('keeps a default name in step with the aggregate and a custom one as typed', () => {
    const form = pivotValueForm(SALES, [0]);

    expect(withAggregate(form, 'average', 'Sales', 'en').name).toBe('Average of Sales');

    expect(withAggregate({ ...form, name: 'Revenue' }, 'average', 'Sales', 'en').name).toBe(
      'Revenue',
    );
  });

  it('builds a difference from the previous item and a percent of a chosen item', () => {
    const form = {
      ...pivotValueForm(SALES, [0]),
      showAs: PivotShowAsKind.Difference,
      format: '0%',
    };

    expect(pivotValueOf(SALES, form, ITEMS)).toMatchObject({
      showAs: { kind: 'difference', field: 0, item: 'previous' },
      format: '0%',
    });

    const percent = pivotValueOf(
      SALES,
      { ...form, showAs: PivotShowAsKind.Percent, item: baseItemKey(text('West')) },
      ITEMS,
    );

    expect(percent.showAs).toEqual({ kind: 'percent', field: 0, item: text('West') });
    expect(pivotValueForm(percent, [0]).item).toBe(baseItemKey(text('West')));

    expect(pivotValueOf(SALES, { ...form, base: undefined }, ITEMS).showAs).toEqual({
      kind: 'normal',
    });
  });

  it('rejects an empty name and a name taken by a field', () => {
    const taken = new Set(['sales', 'count of region']);

    expect(pivotNameError('  ', taken)).toBe('required');
    expect(pivotNameError('Sales', taken)).toBe('taken');
    expect(pivotNameError('Revenue', taken)).toBe(undefined);
  });
});
