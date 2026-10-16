import type { HtmlElement, HtmlNode } from './html.types';

export interface HtmlTableCell {
  readonly element: HtmlElement | undefined;
  readonly header: boolean;
  readonly text: string;
}

export interface HtmlTableGrid {
  readonly rows: readonly (readonly HtmlTableCell[])[];
  readonly head: number;
}

interface HtmlTableRow {
  readonly cells: readonly HtmlElement[];
  readonly head: boolean;
}

const SECTIONS = new Set(['thead', 'tbody', 'tfoot']);

const CELLS = new Set(['td', 'th']);

const MAX_SPAN = 1000;

const EMPTY: HtmlTableCell = { element: undefined, header: false, text: '' };

const elementsOf = (nodes: readonly HtmlNode[]): HtmlElement[] =>
  nodes.filter((node): node is HtmlElement => node.kind === 'element');

const rowOf = (row: HtmlElement, head: boolean): HtmlTableRow => ({
  cells: elementsOf(row.children).filter((cell) => CELLS.has(cell.tag)),
  head,
});

const rowsIn = (element: HtmlElement, head: boolean): HtmlTableRow[] =>
  elementsOf(element.children).flatMap((child) => {
    if (child.tag === 'tr') {
      return [rowOf(child, head)];
    }
    return SECTIONS.has(child.tag) ? rowsIn(child, head || child.tag === 'thead') : [];
  });

const spanOf = (cell: HtmlElement, name: string): number => {
  const span = Number.parseInt(cell.attr(name) ?? '', 10);

  return Number.isInteger(span) && span > 1 ? Math.min(span, MAX_SPAN) : 1;
};

const cellOf = (element: HtmlElement): HtmlTableCell => ({
  element,
  header: element.tag === 'th',
  text: element.text().replaceAll(/\s+/gu, ' ').trim(),
});

const freeColumn = (row: readonly (HtmlTableCell | undefined)[], from: number): number => {
  let column = from;

  while (row[column] !== undefined) {
    column += 1;
  }
  return column;
};

const place = (
  grid: (HtmlTableCell | undefined)[][],
  rowIndex: number,
  cell: HtmlElement,
  column: number,
): number => {
  const rowspan = Math.min(spanOf(cell, 'rowspan'), grid.length - rowIndex);
  const colspan = spanOf(cell, 'colspan');

  for (let row = rowIndex; row < rowIndex + rowspan; row += 1) {
    for (let col = column; col < column + colspan; col += 1) {
      const target = grid[row];

      if (target !== undefined) {
        target[col] = row === rowIndex && col === column ? cellOf(cell) : EMPTY;
      }
    }
  }
  return column + colspan;
};

export const tableGrid = (table: HtmlElement): HtmlTableGrid => {
  const rows = rowsIn(table, false);
  const grid = rows.map((): (HtmlTableCell | undefined)[] => []);

  for (const [index, row] of rows.entries()) {
    let column = 0;

    for (const cell of row.cells) {
      column = place(grid, index, cell, freeColumn(grid[index] ?? [], column));
    }
  }
  const width = Math.max(0, ...grid.map((row) => row.length));
  const body = rows.findIndex((row) => !row.head);

  return {
    rows: grid.map((row) => Array.from({ length: width }, (_, col) => row[col] ?? EMPTY)),
    head: body === -1 ? rows.length : body,
  };
};
