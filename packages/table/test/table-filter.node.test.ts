import { describe, expect, it } from 'vite-plus/test';
import {
  chosenIn,
  draftOf,
  filterFromDraft,
  filterKindOf,
  filterOf,
  valuesToggled,
  valuesWith,
  withFilter,
  type SetFilterDraft,
} from '../src/table/table-filter';
import type { NuiTableFilters, NuiTableColumn } from '../src';

interface Row {
  readonly name: string;
  readonly age: number;
  readonly born: Date;
  readonly active: boolean;
}

const COLUMNS: readonly NuiTableColumn<Row>[] = [
  { key: 'name', label: 'Name', type: 'text', value: (row) => row.name },
  { key: 'age', label: 'Age', type: 'number', value: (row) => row.age },
  { key: 'born', label: 'Born', type: 'date', value: (row) => row.born },
  { key: 'active', label: 'Active', type: 'boolean', value: (row) => row.active },
  { key: 'tag', label: 'Tag', type: 'text', filter: 'set', value: (row) => row.name },
  { key: 'note', label: 'Note', type: 'text', filter: false, value: (row) => row.name },
];

describe('grid filters', () => {
  it('derives the filter kind from the column type unless the column overrides it', () => {
    expect(COLUMNS.map(filterKindOf)).toEqual(['text', 'number', 'date', 'set', 'set', undefined]);
  });

  it('turns drafts into filters and back, dropping empty drafts', () => {
    expect(filterFromDraft('name', draftOf('text', undefined))).toBeNull();

    expect(filterFromDraft('name', { kind: 'text', op: 'contains', value: ' ан ' })).toEqual({
      kind: 'text',
      key: 'name',
      op: 'contains',
      value: 'ан',
    });

    expect(filterFromDraft('name', { kind: 'text', op: 'empty', value: '' })).toEqual({
      kind: 'text',
      key: 'name',
      op: 'empty',
      value: '',
    });

    expect(filterFromDraft('age', { kind: 'number', min: 18, max: null })).toEqual({
      kind: 'number',
      key: 'age',
      min: 18,
      max: undefined,
    });

    expect(filterFromDraft('age', { kind: 'number', min: null, max: null })).toBeNull();

    const range = filterFromDraft('born', { kind: 'date', from: '2024-01-01', to: '2024-01-31' });

    expect(range).toEqual({
      kind: 'date',
      key: 'born',
      from: Date.UTC(2024, 0, 1),
      to: Date.UTC(2024, 1, 1) - 1,
    });

    expect(draftOf('date', range ?? undefined)).toEqual({
      kind: 'date',
      from: '2024-01-01',
      to: '2024-01-31',
    });

    expect(filterFromDraft('active', { kind: 'set', values: [], exclude: false })).toBeNull();
    expect(filterFromDraft('active', { kind: 'set', values: [], exclude: true })).toBeNull();

    expect(filterFromDraft('tag', { kind: 'set', values: ['a'], exclude: false })).toEqual({
      kind: 'set',
      key: 'tag',
      values: ['a'],
    });

    expect(filterFromDraft('tag', { kind: 'set', values: ['a'], exclude: true })).toEqual({
      kind: 'set',
      key: 'tag',
      values: ['a'],
      exclude: true,
    });

    expect(draftOf('set', { kind: 'set', key: 'active', values: [true, null] })).toEqual({
      kind: 'set',
      values: [true, null],
      exclude: false,
    });

    expect(draftOf('set', { kind: 'set', key: 'tag', values: ['a'], exclude: true })).toEqual({
      kind: 'set',
      values: ['a'],
      exclude: true,
    });
  });

  it('reads and changes the choice of a draft that names the values to hide the other way round', () => {
    const shown: SetFilterDraft = { kind: 'set', values: ['a', 'b'], exclude: false };
    const hidden: SetFilterDraft = { kind: 'set', values: ['a', 'b'], exclude: true };

    expect(['a', 'c'].map((value) => chosenIn(shown, value))).toEqual([true, false]);
    expect(['a', 'c'].map((value) => chosenIn(hidden, value))).toEqual([false, true]);
    expect(valuesToggled(shown, 'a')).toEqual(['b']);
    expect(valuesToggled(hidden, 'c')).toEqual(['a', 'b', 'c']);
    expect(valuesWith(shown, ['b', 'c'], true)).toEqual(['a', 'b', 'c']);
    expect(valuesWith(shown, ['b', 'c'], false)).toEqual(['a']);
    expect(valuesWith(hidden, ['b', 'c'], true)).toEqual(['a']);
    expect(valuesWith(hidden, ['b', 'c'], false)).toEqual(['a', 'b', 'c']);
  });

  it('replaces one column filter at a time', () => {
    const filters: NuiTableFilters = [
      { kind: 'text', key: 'name', op: 'contains', value: 'ан' },
      { kind: 'number', key: 'age', min: 18 },
    ];

    const next = withFilter(filters, 'age', { kind: 'number', key: 'age', max: 60 });

    expect(next).toEqual([
      { kind: 'text', key: 'name', op: 'contains', value: 'ан' },
      { kind: 'number', key: 'age', max: 60 },
    ]);

    expect(filterOf(next, 'age')).toEqual({ kind: 'number', key: 'age', max: 60 });
    expect(withFilter(next, 'age', null)).toEqual([filters[0]]);
    expect(filterOf(next, 'born')).toBeUndefined();
  });
});
