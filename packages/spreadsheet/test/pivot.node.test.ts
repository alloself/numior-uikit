import { describe, expect, it } from 'vite-plus/test';
import { formatRange, parseRange, pivotCaptions, type CellValue } from '../src/core';
import { buildPivotCache, pivotTableOf } from '../src/core/pivot/pivot-cache';
import { VALUES_FIELD, computePivot } from '../src/core/pivot/pivot-engine';
import { renderPivot } from '../src/core/pivot/pivot-render';
import type {
  PivotDefinition,
  PivotField,
  PivotSource,
  PivotValue,
} from '../src/core/pivot/pivot.types';
import { EMPTY, errorValue, numberValue, textValue } from '../src/core/values';
import { openBook } from './book-harness';

type Input = string | number;

const SALES: readonly (readonly Input[])[] = [
  ['Region', 'City', 'Year', 'Sales'],
  ['East', 'Boston', 2021, 100],
  ['East', 'NYC', 2021, 200],
  ['East', 'Boston', 2022, 50],
  ['West', 'LA', 2021, 150],
  ['West', 'LA', 2022, 70],
];

const CAPTIONS = pivotCaptions('en');

const valueOf = (input: Input): CellValue => {
  if (typeof input === 'number') {
    return numberValue(input);
  }
  if (input === '') {
    return EMPTY;
  }
  return input.startsWith('#') ? errorValue('#N/A') : textValue(input);
};

const sum = (field: number, name: string): PivotValue => ({
  field,
  aggregate: 'sum',
  name,
  showAs: { kind: 'normal' },
  format: undefined,
});

const field = (changes: Partial<PivotField>): PivotField => ({
  order: [],
  hidden: [],
  sort: 'manual',
  subtotal: true,
  ...changes,
});

const definitionOf = (source: PivotSource, changes: Partial<PivotDefinition>): PivotDefinition => ({
  source,
  rows: [0, 1],
  columns: [2],
  filters: [],
  values: [sum(3, 'Sum of Sales')],
  fields: [],
  layout: 'compact',
  rowTotals: true,
  columnTotals: true,
  captions: CAPTIONS,
  ...changes,
});

const shownText = (value: CellValue, format: string | undefined): string => {
  switch (value.kind) {
    case 'number':
      return format === '0.00%' ? `${(value.value * 100).toFixed(2)}%` : String(value.value);
    case 'error':
      return value.code;
    case 'empty':
      return '';
    default:
      return String(value.value);
  }
};

const grid = (changes: Partial<PivotDefinition>, rows: readonly (readonly Input[])[] = SALES) => {
  const cache = buildPivotCache(pivotTableOf(rows.map((row) => row.map(valueOf))));

  if (cache === undefined) {
    throw new Error('the source has no header');
  }

  const definition = definitionOf({ kind: 'lost' }, changes);
  const output = renderPivot(definition, cache, computePivot(definition, cache));

  const lines = Array.from({ length: output.size.row }, () =>
    Array.from({ length: output.size.col }, () => ''),
  );

  output.cells.forEach((cell) => {
    const line = lines[cell.row];

    if (line !== undefined) {
      line[cell.col] = shownText(cell.value, cell.format);
    }
  });

  return lines.map((line) => line.join(' | '));
};

const rangeAt = (address: string) => {
  const range = parseRange(address);

  if (range === undefined) {
    throw new Error(`${address} is not a range`);
  }
  return range;
};

const salesBook = () => {
  const sheet = openBook();

  SALES.forEach((row, index) => {
    row.forEach((input, col) => {
      sheet.type(`${'ABCD'.charAt(col)}${String(index + 1)}`, String(input));
    });
  });

  const source: PivotSource = { kind: 'range', sheet: 'Sheet1', range: rangeAt('A1:D6') };

  const place = (anchor = { row: 2, col: 0 }, changes: Partial<PivotDefinition> = {}) =>
    sheet.commit({
      kind: 'setPivot',
      sheet: 'Rates',
      name: 'Sales',
      pivot: { anchor, definition: definitionOf(source, { rows: [0], ...changes }) },
    });

  const footprint = (): string | undefined => {
    const pivot = sheet.book.pivots.get(sheet.rates, 'Sales');

    return pivot?.footprint === undefined ? undefined : formatRange(pivot.footprint);
  };

  return { ...sheet, place, footprint };
};

describe('pivot engine', () => {
  it('lays out rows, columns and totals in compact, outline and tabular form', () => {
    expect(grid({})).toEqual([
      'Sum of Sales | Column Labels |  | ',
      'Row Labels | 2021 | 2022 | Grand Total',
      'East | 300 | 50 | 350',
      'Boston | 100 | 50 | 150',
      'NYC | 200 |  | 200',
      'West | 150 | 70 | 220',
      'LA | 150 | 70 | 220',
      'Grand Total | 450 | 120 | 570',
    ]);

    expect(grid({ layout: 'outline' })).toEqual([
      'Sum of Sales |  | Year |  | ',
      'Region | City | 2021 | 2022 | Grand Total',
      'East |  | 300 | 50 | 350',
      ' | Boston | 100 | 50 | 150',
      ' | NYC | 200 |  | 200',
      'West |  | 150 | 70 | 220',
      ' | LA | 150 | 70 | 220',
      'Grand Total |  | 450 | 120 | 570',
    ]);

    expect(grid({ layout: 'tabular' })).toEqual([
      'Sum of Sales |  | Year |  | ',
      'Region | City | 2021 | 2022 | Grand Total',
      'East | Boston | 100 | 50 | 150',
      ' | NYC | 200 |  | 200',
      'East Total |  | 300 | 50 | 350',
      'West | LA | 150 | 70 | 220',
      'West Total |  | 150 | 70 | 220',
      'Grand Total |  | 450 | 120 | 570',
    ]);
  });

  it('spreads several values over columns and a lone value over one cell', () => {
    const count: PivotValue = { ...sum(3, 'Count of Sales'), aggregate: 'count' };

    expect(grid({ columns: [], values: [sum(3, 'Sum of Sales'), count] })).toEqual([
      ' | Values | ',
      'Row Labels | Sum of Sales | Count of Sales',
      'East | 350 | 3',
      'Boston | 150 | 2',
      'NYC | 200 | 1',
      'West | 220 | 2',
      'LA | 220 | 2',
      'Grand Total | 570 | 5',
    ]);

    expect(grid({ rows: [0], values: [sum(3, 'Sum of Sales'), count] })).toEqual([
      ' | Column Labels |  |  |  |  | ',
      ' | 2021 |  | 2022 |  | Total Sum of Sales | Total Count of Sales',
      'Row Labels | Sum of Sales | Count of Sales | Sum of Sales | Count of Sales |  | ',
      'East | 300 | 2 | 50 | 1 | 350 | 3',
      'West | 150 | 1 | 70 | 1 | 220 | 2',
      'Grand Total | 450 | 3 | 120 | 2 | 570 | 5',
    ]);

    expect(grid({ rows: [], columns: [] })).toEqual(['Sum of Sales', '570']);
    expect(VALUES_FIELD).toBe(-2);
  });

  it('filters by page fields and hidden items and orders items by hand or by value', () => {
    expect(
      grid({ rows: [0], columns: [], filters: [{ field: 2, selected: numberValue(2021) }] }),
    ).toEqual([
      'Year | 2021',
      ' | ',
      'Row Labels | Sum of Sales',
      'East | 300',
      'West | 150',
      'Grand Total | 450',
    ]);

    expect(grid({ rows: [0], fields: [field({ hidden: [textValue('West')] })] }).slice(2)).toEqual([
      'East | 300 | 50 | 350',
      'Grand Total | 300 | 50 | 350',
    ]);

    expect(
      grid({ rows: [1], columns: [], fields: [field({}), field({ order: [textValue('nyc')] })] }),
    ).toEqual([
      'Row Labels | Sum of Sales',
      'NYC | 200',
      'Boston | 150',
      'LA | 220',
      'Grand Total | 570',
    ]);

    expect(
      grid({ rows: [0], columns: [], fields: [field({ sort: 'descending' })] }).slice(1, 3),
    ).toEqual(['West | 220', 'East | 350']);
  });

  it('shows blanks as their own item, keeps errors and leaves groups without values empty', () => {
    const rows = [...SALES, ['West', '', 2022, '#N/A'], ['North', 'Oslo', 2023, '']];

    expect(grid({ columns: [], layout: 'tabular' }, rows)).toEqual([
      'Region | City | Sum of Sales',
      'East | Boston | 150',
      ' | NYC | 200',
      'East Total |  | 350',
      'West | LA | 220',
      ' | (blank) | #N/A',
      'West Total |  | #N/A',
      'North | Oslo | ',
      'North Total |  | ',
      'Grand Total |  | #N/A',
    ]);
  });

  it('shows values as shares, running totals and differences', () => {
    expect(
      grid({
        columns: [],
        values: [{ ...sum(3, 'Share'), showAs: { kind: 'percentOfTotal' } }],
      }).slice(1, 4),
    ).toEqual(['East | 61.40%', 'Boston | 26.32%', 'NYC | 35.09%']);

    expect(
      grid({
        rows: [0],
        values: [{ ...sum(3, 'Running'), showAs: { kind: 'runTotal', field: 2 } }],
      }),
    ).toEqual([
      'Running | Column Labels |  | ',
      'Row Labels | 2021 | 2022 | Grand Total',
      'East | 300 | 350 | ',
      'West | 150 | 220 | ',
      'Grand Total | 450 | 570 | ',
    ]);

    expect(
      grid({
        rows: [0],
        values: [
          { ...sum(3, 'Change'), showAs: { kind: 'difference', field: 2, item: 'previous' } },
        ],
      }).slice(2),
    ).toEqual(['East |  | -250 | ', 'West |  | -80 | ', 'Grand Total |  | -330 | ']);
  });

  it('averages, spreads and counts with Excel semantics', () => {
    expect(
      grid({
        rows: [0],
        columns: [],
        values: [
          { ...sum(3, 'Average'), aggregate: 'average' },
          { ...sum(3, 'Spread'), aggregate: 'stdDev' },
          { ...sum(1, 'Cities'), aggregate: 'count' },
        ],
      }).slice(2),
    ).toEqual([
      'East | 116.66666666666667 | 76.37626158259734 | 3',
      'West | 110 | 56.568542494923804 | 2',
      'Grand Total | 114 | 61.07372593840988 | 5',
    ]);
  });

  it('multiplies, counts numbers and takes extremes and variances', () => {
    const aggregates = ['product', 'countNums', 'min', 'max', 'var', 'varp', 'stdDevp'] as const;

    expect(
      grid({
        rows: [0],
        columns: [],
        values: aggregates.map((aggregate) => ({ ...sum(3, aggregate), aggregate })),
      }).slice(2, 4),
    ).toEqual([
      'East | 1000000 | 3 | 50 | 200 | 5833.333333333333 | 3888.8888888888887 | 62.36095644623236',
      'West | 10500 | 2 | 70 | 150 | 3200 | 1600 | 40',
    ]);
  });
});

describe('pivot steps', () => {
  it('writes the pivot into cells, refreshes it from the source and undoes both', () => {
    const book = salesBook();

    expect(book.place().ok).toBe(true);
    expect(book.footprint()).toBe('A3:D7');

    expect(['A3', 'B4', 'D5', 'D7'].map((address) => book.shown(address, 'Rates'))).toEqual([
      'Sum of Sales',
      '2021',
      '350',
      '570',
    ]);

    book.type('D2', '1000');
    expect(book.shown('D7', 'Rates')).toBe('570');
    expect(book.commit({ kind: 'refreshPivot', sheet: 'Rates', name: 'sales' }).ok).toBe(true);
    expect(book.shown('D7', 'Rates')).toBe('1470');

    book.history.undo();
    expect(book.shown('D7', 'Rates')).toBe('570');

    book.history.undo();
    book.history.undo();
    expect([book.footprint(), book.shown('A3', 'Rates')]).toEqual([undefined, '']);
  });

  it('moves with lines, grows its source and refuses lines that cut through it', () => {
    const book = salesBook();

    book.place();
    expect(book.insert('1', 2, 'Rates').ok).toBe(true);
    expect(book.footprint()).toBe('A5:D9');

    expect(book.insert('6', 1, 'Rates')).toEqual({ ok: false, reason: 'pivot-overlap' });
    expect(book.remove('B', 1, 'Rates')).toEqual({ ok: false, reason: 'pivot-overlap' });

    book.insert('3');
    book.type('A3', 'North');
    book.type('D3', '5');
    book.commit({ kind: 'refreshPivot', sheet: 'Rates', name: 'Sales' });
    expect(book.shown('A8', 'Rates')).toBe('North');

    book.commit({ kind: 'renameSheet', from: 'Sheet1', to: 'Data' });
    expect(book.commit({ kind: 'refreshPivot', sheet: 'Rates', name: 'Sales' }).ok).toBe(true);

    expect(book.remove('5', 6, 'Rates').ok).toBe(true);
    expect(book.footprint()).toBeUndefined();

    book.history.undo();
    expect(book.footprint()).toBe('A5:E10');
  });

  it('drops the formats of its previous layout when the definition changes', () => {
    const book = salesBook();
    const share = { ...sum(3, 'Sum of Sales'), showAs: { kind: 'percentOfTotal' as const } };

    book.place({ row: 2, col: 0 }, { columns: [], values: [share] });

    expect(book.shown('B5', 'Rates')).toMatch(/%$/u);

    book.place({ row: 2, col: 0 }, { columns: [] });

    expect(book.shown('B5', 'Rates')).not.toMatch(/%$/u);
  });

  it('refuses edits to its cells but lets them be formatted', () => {
    const book = salesBook();

    book.place();

    expect(() => {
      book.type('B5', '1', 'Rates');
    }).toThrow('pivot-output');

    expect(
      book.commit({
        kind: 'setCells',
        sheet: 'Rates',
        cells: [{ row: 4, col: 1, format: '0.0' }],
      }).ok,
    ).toBe(true);

    expect(book.shown('B5', 'Rates')).toBe('300.0');
    expect(book.commit({ kind: 'refreshPivot', sheet: 'Rates', name: 'Sales' }).ok).toBe(true);
    expect(book.shown('B5', 'Rates')).toBe('300.0');

    book.history.undo();
    book.history.undo();
    book.history.undo();
    expect(book.footprint()).toBeUndefined();

    book.type('B5', '1', 'Rates');
    expect(book.shown('B5', 'Rates')).toBe('1');
  });

  it('refuses pivots over other pivots and fields the source does not have', () => {
    const book = salesBook();

    book.place();

    expect(
      book.commit({
        kind: 'setPivot',
        sheet: 'Rates',
        name: 'Other',
        pivot: {
          anchor: { row: 4, col: 2 },
          definition: definitionOf({ kind: 'range', sheet: 'Sheet1', range: rangeAt('A1:D6') }, {}),
        },
      }),
    ).toEqual({ ok: false, reason: 'pivot-overlap' });

    expect(book.place({ row: 2, col: 0 }, { rows: [7] })).toEqual({
      ok: false,
      reason: 'invalid-pivot',
    });
  });
});
