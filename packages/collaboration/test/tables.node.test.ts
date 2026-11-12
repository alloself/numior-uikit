import { contentSchema, contentTableData } from '@numior/content';
import { createDoc, type Command, type Doc, type ElementNode } from '@numior/editor-core';
import { describe, expect, it } from 'vite-plus/test';
import {
  deleteTableColumn,
  insertTableColumn,
  insertTableRows,
  orderTableColumns,
  setTableCells,
} from '../../editor-vue/src/blocks/table/table-commands';
import { createNetwork, type CollabNetwork, type NetworkClient } from './harness/network';

type Turn = (client: NetworkClient) => readonly Command[];

const KEYS = ['item', 'sum', 'note'];

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
      element('table_cell', `${id}-${String(index)}`, [], { column: KEYS[index] ?? '', value }),
    ),
  );

const ledger = (rows: number): Doc =>
  createDoc(
    contentSchema,
    element('doc', 'root', [
      element('table', 't', [
        element(
          'table_head',
          'h',
          KEYS.map((key) => element('table_column', key, [], { key, name: key })),
        ),
        element(
          'table_body',
          'b',
          Array.from({ length: rows }, (_unused, index) =>
            row(`r${String(index)}`, `i${String(index)}`, index, `n${String(index)}`),
          ),
        ),
      ]),
    ]),
  );

const gridOf = (client: NetworkClient): readonly string[] => {
  const table = client.state().doc.byId('t');

  if (table === undefined) {
    return [];
  }

  const { columns, rows } = contentTableData(table);

  return [
    columns.map((column) => column.name).join(' | '),
    ...rows.map((line) => line.cells.map(String).join(' | ')),
  ];
};

const lastRow = (client: NetworkClient): string =>
  contentTableData(client.state().doc.byId('t') ?? element('table', 'none')).rows.at(-1)?.id ?? '';

const filledRow: Turn = (client) => {
  client.run(insertTableRows('t', 1));

  const added = lastRow(client);

  return [
    setTableCells('t', [
      { row: added, column: 'item', value: 'x' },
      { row: added, column: 'sum', value: 7 },
      { row: added, column: 'note', value: 'z' },
    ]),
  ];
};

const raced = (ann: Turn, bob: Turn): CollabNetwork => {
  const network = createNetwork(ledger(1), ['ann', 'bob']);
  const [first, second] = network.clients;

  network.settle();

  if (first === undefined || second === undefined) {
    throw new Error('The network has no two clients');
  }
  for (const command of ann(first)) {
    first.run(command);
  }
  for (const command of bob(second)) {
    second.run(command);
  }
  network.settle();

  return network;
};

const gridsOf = (network: CollabNetwork): readonly (readonly string[])[] =>
  network.clients.map(gridOf);

describe('a document table edited by two people at once', () => {
  it('keeps a filled row under its columns when a column appears in front of them', () => {
    const network = raced(() => [insertTableColumn('t', 0, 'new')], filledRow);
    const grid = ['new | item | sum | note', 'null | i0 | 0 | n0', 'null | x | 7 | z'];

    expect(gridsOf(network)).toEqual([grid, grid]);
  });

  it('keeps a filled row under its columns when one of them is deleted', () => {
    const network = raced(() => [deleteTableColumn('t', 'item')], filledRow);
    const grid = ['sum | note', '0 | n0', '7 | z'];

    expect(gridsOf(network)).toEqual([grid, grid]);
  });

  it('keeps a filled row under its columns when the columns change places', () => {
    const network = raced(() => [orderTableColumns('t', ['note', 'item', 'sum'])], filledRow);
    const grid = ['note | item | sum', 'n0 | i0 | 0', 'z | x | 7'];

    expect(gridsOf(network)).toEqual([grid, grid]);
  });

  it('keeps both columns two people add at the same place', () => {
    const network = raced(
      () => [insertTableColumn('t', 1, 'ann')],
      () => [insertTableColumn('t', 1, 'bob')],
    );

    const [grid] = gridsOf(network);

    expect(gridsOf(network)).toEqual([grid, grid]);
    expect(grid?.[1]).toBe('i0 | null | null | 0 | n0');
  });
});
