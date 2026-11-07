import { describe, expect, it } from 'vite-plus/test';
import {
  VALUES_FIELD,
  checkField,
  currentRegion,
  emptyPivot,
  formatRange,
  moveField,
  pivotAreas,
  pivotSourceFields,
  placeField,
  removeField,
  usedFields,
  type PivotDefinition,
  type PivotPlacement,
} from '../src/core';
import { openBook } from './book-harness';

const PLACEMENT: PivotPlacement = {
  fields: [
    { name: 'Region', numeric: false },
    { name: 'City', numeric: false },
    { name: 'Year', numeric: true },
    { name: 'Sales', numeric: true },
  ],
  language: 'en',
};

const EMPTY = emptyPivot({ kind: 'lost' }, 'en');

const built = (...steps: ((definition: PivotDefinition) => PivotDefinition)[]): PivotDefinition =>
  steps.reduce((definition, step) => step(definition), EMPTY);

const checked =
  (field: number) =>
  (definition: PivotDefinition): PivotDefinition =>
    checkField(definition, field, true, PLACEMENT);

const names = (definition: PivotDefinition): string[] =>
  definition.values.map((value) => value.name);

describe('pivot field layout', () => {
  it('puts a checked text field into rows and a checked number field into values', () => {
    const definition = built(checked(0), checked(3));

    expect(pivotAreas(definition)).toEqual({ filters: [], columns: [], rows: [0], values: [3] });
    expect(names(definition)).toEqual(['Sum of Sales']);
    expect(definition.values[0]?.aggregate).toBe('sum');
  });

  it('counts a text field dropped into values and keeps value names unique', () => {
    const definition = built(
      (each) => placeField(each, 0, { area: 'values', index: 0 }, PLACEMENT),
      (each) => placeField(each, 0, { area: 'values', index: 1 }, PLACEMENT),
    );

    expect(names(definition)).toEqual(['Count of Region', 'Count of Region2']);
  });

  it('shows the values field in columns once there are two values and drops it with the second', () => {
    const two = built(checked(2), checked(3));

    expect(pivotAreas(two).columns).toEqual([VALUES_FIELD]);
    expect(removeField(two, { area: 'columns', index: 0 })).toBe(two);

    const one = removeField(two, { area: 'values', index: 0 });

    expect(pivotAreas(one).columns).toEqual([]);
    expect(one.columns).toEqual([]);
  });

  it('moves the values field between rows and columns only', () => {
    const two = built(checked(0), checked(2), checked(3));

    const rowsFirst = moveField(
      two,
      { area: 'columns', index: 0 },
      { area: 'rows', index: 0 },
      PLACEMENT,
    );

    expect(pivotAreas(rowsFirst)).toMatchObject({ rows: [VALUES_FIELD, 0], columns: [] });

    expect(
      moveField(two, { area: 'columns', index: 0 }, { area: 'filters', index: 0 }, PLACEMENT),
    ).toBe(two);
  });

  it('reorders a field inside its area and moves it out of another axis area', () => {
    const rows = built(checked(0), checked(1));

    const swapped = moveField(
      rows,
      { area: 'rows', index: 0 },
      { area: 'rows', index: 2 },
      PLACEMENT,
    );

    expect(pivotAreas(swapped).rows).toEqual([1, 0]);

    const filtered = moveField(
      rows,
      { area: 'rows', index: 1 },
      { area: 'filters', index: 0 },
      PLACEMENT,
    );

    expect(pivotAreas(filtered)).toMatchObject({ filters: [1], rows: [0] });
    expect(filtered.filters).toEqual([{ field: 1, selected: undefined }]);

    const back = placeField(filtered, 1, { area: 'columns', index: 0 }, PLACEMENT);

    expect(pivotAreas(back)).toMatchObject({ filters: [], columns: [1], rows: [0] });
  });

  it('turns a value into a row field and a row field into a value', () => {
    const definition = built(checked(0), checked(3));

    const asRow = moveField(
      definition,
      { area: 'values', index: 0 },
      { area: 'rows', index: 0 },
      PLACEMENT,
    );

    expect(pivotAreas(asRow)).toMatchObject({ rows: [3, 0], values: [] });

    const asValue = moveField(
      asRow,
      { area: 'rows', index: 1 },
      { area: 'values', index: 0 },
      PLACEMENT,
    );

    expect(pivotAreas(asValue)).toMatchObject({ rows: [3], values: [0] });
    expect(names(asValue)).toEqual(['Count of Region']);
  });

  it('keeps a field in rows and in values and clears it from both when unchecked', () => {
    const definition = built(checked(0), (each) =>
      placeField(each, 0, { area: 'values', index: 0 }, PLACEMENT),
    );

    expect([...usedFields(definition)]).toEqual([0]);

    const cleared = checkField(definition, 0, false, PLACEMENT);

    expect(pivotAreas(cleared)).toEqual({ filters: [], columns: [], rows: [], values: [] });
  });
});

describe('pivot sources', () => {
  it('finds the region around a cell and reads its fields', () => {
    const sheet = openBook();

    [
      ['A1', 'Region'],
      ['B1', 'Sales'],
      ['A2', 'East'],
      ['B2', '10'],
      ['A3', 'West'],
      ['B3', '20'],
      ['C4', 'touching'],
      ['F9', 'apart'],
    ].forEach(([address = '', text = '']) => {
      sheet.type(address, text);
    });

    const region = currentRegion(sheet.first.cells, 1, 1);

    expect(formatRange(region)).toBe('A1:C4');
    expect(formatRange(currentRegion(sheet.first.cells, 8, 5))).toBe('F9');
    expect(formatRange(currentRegion(sheet.first.cells, 20, 20))).toBe('U21');

    expect(
      pivotSourceFields(sheet.book, {
        kind: 'range',
        sheet: 'Sheet1',
        range: { top: 0, left: 0, bottom: 2, right: 1 },
      }),
    ).toEqual([
      { name: 'Region', numeric: false },
      { name: 'Sales', numeric: true },
    ]);

    expect(pivotSourceFields(sheet.book, { kind: 'range', sheet: 'Sheet1', range: region })).toBe(
      undefined,
    );
  });

  it('follows a long column of data past the first probe', () => {
    const sheet = openBook();

    Array.from({ length: 300 }, (_, row) => row).forEach((row) => {
      sheet.first.cells.set(row, 0, { kind: 'number', value: row });
    });

    expect(formatRange(currentRegion(sheet.first.cells, 150, 0))).toBe('A1:A300');
  });
});
