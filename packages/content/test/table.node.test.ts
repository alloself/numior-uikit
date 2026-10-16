import { fromHTML, toJSON } from '@numior/editor-core';
import { describe, expect, it } from 'vitest';
import { cellValueOf, columnLetter, contentSchema, contentTableData, parseCellText } from '../src';
import { node } from './support/documents';

const tableOf = (html: string) => {
  const [table] = fromHTML(contentSchema, html).root.content;

  return table?.kind === 'element' && table.type === 'table' ? contentTableData(table) : undefined;
};

const shapeOf = (html: string) => {
  const data = tableOf(html);

  return {
    columns: data?.columns.map((column) => `${column.name}:${column.type}`),
    rows: data?.rows.map((row) => row.cells),
  };
};

describe('content tables', () => {
  it('reads numbers, dates and flags the way office suites write them', () => {
    expect(parseCellText('1 234,5', 'number')).toBe(1234.5);
    expect(parseCellText('1,234.5', 'number')).toBe(1234.5);
    expect(parseCellText('−5', 'number')).toBeNull();
    expect(parseCellText('12%', 'number')).toBeNull();
    expect(parseCellText('05.11.2026', 'date')).toBe('2026-11-05');
    expect(parseCellText('2026-02-30', 'date')).toBeNull();
    expect(parseCellText('ИСТИНА', 'boolean')).toBe(true);
    expect(parseCellText('no', 'boolean')).toBe(false);
    expect(parseCellText('  ', 'text')).toBeNull();
    expect(cellValueOf(12, 'text')).toBe('12');
    expect(cellValueOf('7', 'number')).toBe(7);
    expect(cellValueOf('maybe', 'boolean')).toBeNull();
    expect(cellValueOf('31.12.2026', 'date')).toBe('2026-12-31');
    expect([0, 25, 26, 701, 702].map(columnLetter)).toEqual(['A', 'Z', 'AA', 'ZZ', 'AAA']);
  });

  it('takes the first row of a pasted sheet as names and types each column by its values', () => {
    expect(
      shapeOf(
        '<table><tr><td>Товар<td>Цена<td>Есть<td>Дата</tr>' +
          '<tr><td>Яблоки<td>1 200,5<td>TRUE<td>01.10.2026</tr>' +
          '<tr><td>Груши<td><td>FALSE<td>2026-10-02</tr></table>',
      ),
    ).toEqual({
      columns: ['Товар:text', 'Цена:number', 'Есть:boolean', 'Дата:date'],
      rows: [
        ['Яблоки', 1200.5, true, '2026-10-01'],
        ['Груши', null, false, '2026-10-02'],
      ],
    });
  });

  it('names columns by letters when the first row holds data', () => {
    expect(shapeOf('<table><tr><td>1<td>a</tr><tr><td>2<td>b</tr></table>')).toEqual({
      columns: ['A:number', 'B:text'],
      rows: [
        [1, 'a'],
        [2, 'b'],
      ],
    });

    expect(shapeOf('<table><tr><th>Only</th></tr></table>')).toEqual({
      columns: ['Only:text'],
      rows: [],
    });
  });

  it('keeps the read rows while their nodes stay and pads short rows with empty cells', () => {
    const table = node('table', [
      node('table_head', [
        node('table_column', [], { name: 'A', type: 'number' }),
        node('table_column', [], { name: 'B' }),
      ]),
      node('table_body', [node('table_row', [node('table_cell', [], { value: '3' })])]),
    ]);

    const data = contentTableData(table);

    expect(data.rows).toEqual([{ id: data.rows[0]?.id, cells: [3, null] }]);
    expect(contentTableData(table)).toBe(data);
    expect(toJSON(fromHTML(contentSchema, '<table></table>')).root.content).toHaveLength(1);
  });
});
