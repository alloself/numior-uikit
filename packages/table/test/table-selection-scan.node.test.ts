import { createVersion } from '@numior/primitives';
import { shallowRef } from 'vue';
import { describe, expect, it } from 'vite-plus/test';
import type { TableEngine } from '../src/engine';
import { useTableSelection, type TableSelection } from '../src/table/use-table-selection';
import { EngineHarness, PEOPLE_COLUMNS, type Person } from './harness/engine';

interface HeaderScene {
  readonly rows: readonly Person[];
  readonly selection: TableSelection<Person>;
  readonly reads: () => number;
  select(rows: readonly Person[]): void;
  selected(): readonly Person[];
}

const ROWS = 20_000;
const ONE_BATCH = 4096;

const many = (count: number): Person[] =>
  Array.from({ length: count }, (_, index) => ({
    name: `Имя ${index}`,
    age: index % 90,
    born: new Date(2000, 0, 1 + (index % 365)),
    active: index % 2 === 0,
  }));

const headerOver = (count: number): HeaderScene => {
  const rows = many(count);
  const harness = new EngineHarness(PEOPLE_COLUMNS, rows);
  const selected = shallowRef<readonly Person[]>([]);
  const counter = { reads: 0 };

  const engine: TableEngine<Person> = {
    ...harness.engine,
    nodeAt: (position) => {
      counter.reads += 1;
      return harness.engine.nodeAt(position);
    },
  };

  const selection = useTableSelection<Person>({
    mode: () => 'multiple',
    selected,
    keyOf: (row) => row,
    engine: shallowRef(engine),
    revision: createVersion(),
    scope: () => ({ start: 0, end: harness.engine.count() }),
    disabled: () => false,
    selectKeyAt: () => false,
  });

  return {
    rows,
    selection,
    reads: () => counter.reads,
    select: (next) => {
      counter.reads = 0;
      selected.value = next;
    },
    selected: () => selected.value,
  };
};

describe('table header checkbox', () => {
  it('reads one row to know it is enabled and none to know nothing is selected', () => {
    const scene = headerOver(ROWS);

    expect(scene.selection.headerState.value).toBe('unchecked');
    expect(scene.selection.headerDisabled.value).toBe(false);
    expect(scene.reads()).toBe(1);
  });

  it('stops reading rows once it has seen a selected and an unselected one', () => {
    const scene = headerOver(ROWS);
    const early = scene.rows[3];

    scene.select(early === undefined ? [] : [early]);

    expect(scene.selection.headerState.value).toBe('indeterminate');
    expect(scene.reads()).toBeLessThanOrEqual(ONE_BATCH);
  });

  it('answers unchecked for a selection that is not among the rows and checked when all are selected', () => {
    const scene = headerOver(ROWS);

    scene.select(many(1));
    expect(scene.selection.headerState.value).toBe('unchecked');

    scene.select(scene.rows);
    expect(scene.selection.headerState.value).toBe('checked');
  });

  it('selects the missing rows first and clears everything when all rows are selected', () => {
    const scene = headerOver(ROWS);
    const first = scene.rows[0];

    scene.select(first === undefined ? [] : [first]);
    scene.selection.toggleAll();
    expect(scene.selected()).toHaveLength(ROWS);
    expect(scene.selection.headerState.value).toBe('checked');

    scene.selection.toggleAll();
    expect(scene.selected()).toEqual([]);
    expect(scene.selection.headerState.value).toBe('unchecked');
  });
});
