import { contentSchema, contentTableData } from '@numior/content';
import {
  applyStep,
  createDoc,
  createState,
  mapStep,
  stepMapOf,
  type Command,
  type Doc,
  type ElementNode,
  type Step,
} from '@numior/editor-core';
import { describe, expect, it } from 'vite-plus/test';
import {
  deleteTableColumn,
  insertTableColumn,
  moveTableRow,
  orderTableColumns,
  renameTableColumn,
  setTableCells,
} from '../src/blocks/table/table-commands';

interface Carried {
  readonly doc: Doc;
  readonly steps: readonly Step[];
}

const element = (
  type: string,
  id: string,
  content: readonly ElementNode[] = [],
  attrs: Readonly<Record<string, string | number | null>> = {},
): ElementNode => contentSchema.element(type, { id, attrs, content });

const row = (id: string, ...values: readonly (string | number)[]): ElementNode =>
  element(
    'table_row',
    id,
    values.map((value, index) =>
      element('table_cell', `${id}-${String(index)}`, [], {
        column: index === 0 ? 'name' : 'price',
        value,
      }),
    ),
  );

const prices = (): Doc =>
  createDoc(
    contentSchema,
    element('doc', 'root', [
      element('table', 't', [
        element('table_head', 'h', [
          element('table_column', 'name', [], { key: 'name', name: 'Item' }),
          element('table_column', 'price', [], { key: 'price', name: 'Price', type: 'number' }),
        ]),
        element('table_body', 'b', [row('r1', 'Pears', 12), row('r2', 'Plums', 3)]),
      ]),
    ]),
  );

const carried = (start: Doc, command: Command): Carried => {
  const state = createState({ doc: start });
  let done: Carried = { doc: start, steps: [] };

  command(state, (tr) => {
    done = { doc: tr.doc, steps: tr.steps };
  });

  return done;
};

const priced = (doc: Doc, cell: string, value: number): Step => ({
  kind: 'attrs',
  pos: doc.positionOf(cell) ?? -1,
  attrs: { value },
});

const landed = (written: Step, { doc, steps }: Carried): Doc => {
  const moved = steps.reduce<Step | undefined>(
    (step, passed) => (step === undefined ? undefined : mapStep(step, stepMapOf(passed))),
    written,
  );

  const result = moved === undefined ? undefined : applyStep(doc, moved);

  return result?.ok === true ? result.doc : doc;
};

const gridOf = (doc: Doc): readonly string[] => {
  const table = doc.byId('t');

  if (table === undefined) {
    return [];
  }

  const { columns, rows } = contentTableData(table);

  return [
    columns.map((column) => column.name).join(' | '),
    ...rows.map((line) => line.cells.map(String).join(' | ')),
  ];
};

describe('rows and columns carried in a document table', () => {
  it('keeps a value someone else writes into a row while it is carried down', () => {
    const start = prices();
    const moved = carried(start, moveTableRow('t', 'r1', 1));

    expect(gridOf(landed(priced(start, 'r1-1', 99), moved))).toEqual([
      'Item | Price',
      'Plums | 3',
      'Pears | 99',
    ]);
  });

  it('keeps a value someone else writes into a column while the columns change places', () => {
    const start = prices();
    const moved = carried(start, orderTableColumns('t', ['price', 'name']));

    expect(moved.steps).toHaveLength(1);

    expect(gridOf(landed(priced(start, 'r2-1', 7), moved))).toEqual([
      'Price | Item',
      '12 | Pears',
      '7 | Plums',
    ]);
  });

  it('changes a column with one step however many rows the table has', () => {
    const start = prices();

    expect(carried(start, insertTableColumn('t', 0, 'New')).steps).toHaveLength(1);
    expect(carried(start, deleteTableColumn('t', 'name')).steps).toHaveLength(1);

    expect(gridOf(carried(start, insertTableColumn('t', 1, 'New')).doc)[1]).toBe(
      'Pears | null | 12',
    );

    expect(gridOf(carried(start, deleteTableColumn('t', 'name')).doc)).toEqual([
      'Price',
      '12',
      '3',
    ]);
  });

  it('writes into a cell nobody filled yet and into a filled one', () => {
    const start = carried(prices(), insertTableColumn('t', 2, 'Note')).doc;
    const note = contentTableData(start.byId('t') ?? element('table', 'none')).columns[2]?.id ?? '';

    const written = carried(
      start,
      setTableCells('t', [
        { row: 'r2', column: note, value: 'ripe' },
        { row: 'r1', column: 'price', value: 15 },
        { row: 'r1', column: note, value: 'firm' },
      ]),
    );

    expect(gridOf(written.doc)).toEqual([
      'Item | Price | Note',
      'Pears | 15 | firm',
      'Plums | 3 | ripe',
    ]);
  });

  it('leaves the history alone when a column is renamed to its own or to an empty name', () => {
    const start = prices();

    expect(carried(start, renameTableColumn('t', 'name', 'Item')).steps).toHaveLength(0);
    expect(carried(start, renameTableColumn('t', 'name', '  ')).steps).toHaveLength(0);

    expect(gridOf(carried(start, renameTableColumn('t', 'name', ' Fruit ')).doc)[0]).toBe(
      'Fruit | Price',
    );
  });
});
