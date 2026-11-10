import {
  contentHole,
  ContentNodeKind,
  renderTag,
  tableGrid,
  type AttrValue,
  type ElementNode,
  type HtmlElement,
  type HtmlTableCell,
  type NodeMaker,
  type NodeSpec,
  type ParsedContent,
} from '@numior/editor-core';
import {
  ContentAttrValue,
  ContentTag,
  NuiContentNodeType,
  NuiContentTableType,
  type NuiContentCellValue,
  type NuiContentTableColumn,
  type NuiContentTableData,
  type NuiContentTableRow,
} from './content.types';
import { SORT_ATTRS, VIEW_NODES, filterOf, sortOf } from './table-view';
import {
  CONTENT_TABLE_TYPES,
  cellText,
  cellValueOf,
  columnLetter,
  parseCellBoolean,
  parseCellDate,
  parseCellNumber,
  parseCellText,
} from './table-values';

const COLUMN = 'nui-content__table-column';

const TYPE_PREFIX = `${COLUMN}--type-`;

const WIDTH = /^(\d+(?:\.\d+)?)px;?$/u;

const CELL_BREAK = /[\t\n\r]+/gu;

const isType = (value: AttrValue | string | undefined): value is NuiContentTableType =>
  CONTENT_TABLE_TYPES.some((type) => type === value);

const typeOf = (value: AttrValue | undefined): NuiContentTableType =>
  isType(value) ? value : 'text';

const widthOf = (value: AttrValue | undefined): number | undefined =>
  typeof value === 'number' && value > 0 ? value : undefined;

const isWidth = (value: AttrValue): boolean =>
  value === null || (typeof value === 'number' && Number.isFinite(value) && value > 0);

const isCell = (value: AttrValue): boolean => typeof value !== 'number' || Number.isFinite(value);

const textOf = (value: AttrValue | undefined): string => (typeof value === 'string' ? value : '');

const elementsOf = (element: HtmlElement | undefined): readonly HtmlElement[] =>
  (element?.children ?? []).filter(
    (child): child is HtmlElement => child.kind === ContentNodeKind.Element,
  );

const checkboxOf = (cell: HtmlTableCell): HtmlElement | undefined => {
  const input = cell.element?.find('input');

  return input?.attr('type') === ContentAttrValue.Checkbox ? input : undefined;
};

const booleanOf = (cell: HtmlTableCell): boolean | undefined => {
  const checkbox = checkboxOf(cell);

  return checkbox === undefined
    ? parseCellBoolean(cell.text)
    : checkbox.attr('checked') !== undefined;
};

const valueOf = (cell: HtmlTableCell, type: NuiContentTableType): NuiContentCellValue =>
  type === NuiContentTableType.Boolean && checkboxOf(cell) !== undefined
    ? (booleanOf(cell) ?? null)
    : parseCellText(cell.text, type);

const filled = (cell: HtmlTableCell): boolean => cell.text !== '' || checkboxOf(cell) !== undefined;

const inferType = (cells: readonly HtmlTableCell[]): NuiContentTableType => {
  let filledCount = 0;
  let boolean = true;
  let number = true;
  let date = true;

  for (const cell of cells) {
    if (!filled(cell)) {
      continue;
    }
    filledCount += 1;
    boolean &&= booleanOf(cell) !== undefined;
    number &&= parseCellNumber(cell.text) !== undefined;
    date &&= parseCellDate(cell.text) !== undefined;

    if (!boolean && !number && !date) {
      return 'text';
    }
  }

  if (filledCount === 0) {
    return 'text';
  }
  if (boolean) {
    return 'boolean';
  }
  if (number) {
    return 'number';
  }
  return date ? 'date' : 'text';
};

const isOwn = (row: readonly HtmlTableCell[]): boolean =>
  row.some((cell) => cell.element?.hasClass(COLUMN) === true);

const looksLikeHeader = (row: readonly HtmlTableCell[], rest: number): boolean =>
  rest > 0 &&
  row.some(filled) &&
  row.every((cell) => !filled(cell) || inferType([cell]) === NuiContentTableType.Text);

const headed = (rows: readonly (readonly HtmlTableCell[])[], head: number): boolean => {
  const [first] = rows;

  return (
    first !== undefined &&
    (head > 0 ||
      isOwn(first) ||
      first.every((cell) => cell.header) ||
      looksLikeHeader(first, rows.length - 1))
  );
};

const nameOf = (cell: HtmlTableCell | undefined, index: number): string => {
  const own = cell?.element?.hasClass(COLUMN) === true;
  const text = own ? (cell.element?.find('span')?.text().trim() ?? '') : (cell?.text ?? '');

  return own || text !== '' ? text : columnLetter(index);
};

const optionsOf = (cell: HtmlTableCell | undefined): readonly string[] =>
  elementsOf(cell?.element?.find('datalist')).reduce<string[]>((found, option) => {
    if (option.tag !== ContentTag.Option) {
      return found;
    }
    const label = option.attr('value') ?? '';

    if (label !== '') {
      found.push(label);
    }
    return found;
  }, []);

const parsedWidth = (cell: HtmlTableCell | undefined): number | null => {
  const width = WIDTH.exec(cell?.element?.style('width') ?? '');

  return width === null ? null : Number(width[1]);
};

const columnTypeOf = (
  cell: HtmlTableCell | undefined,
  body: readonly (readonly HtmlTableCell[])[],
  index: number,
): NuiContentTableType => {
  const own = cell?.element?.classWith(TYPE_PREFIX);

  return isType(own)
    ? own
    : inferType(body.flatMap((row) => (row[index] === undefined ? [] : [row[index]])));
};

const readContentTable = (table: HtmlElement, make: NodeMaker): ParsedContent => {
  const grid = tableGrid(table);
  const width = grid.rows[0]?.length ?? 0;

  if (width === 0) {
    return false;
  }
  const head = headed(grid.rows, grid.head) ? grid.rows[0] : undefined;
  const body = head === undefined ? grid.rows : grid.rows.slice(1);

  const types = Array.from({ length: width }, (_, index) =>
    columnTypeOf(head?.[index], body, index),
  );

  const columns = types.map((type, index) =>
    make(
      'table_column',
      { name: nameOf(head?.[index], index), type, width: parsedWidth(head?.[index]) },
      optionsOf(head?.[index]).map((label) => make('table_option', { label })),
    ),
  );

  return [
    make('table_head', {}, columns),
    make(
      'table_body',
      {},
      body.map((row) =>
        make(
          'table_row',
          {},
          types.map((type, index) => {
            const cell = row[index];

            return make('table_cell', { value: cell === undefined ? null : valueOf(cell, type) });
          }),
        ),
      ),
    ),
  ];
};

const part = (name: string, modifier?: string | false): string =>
  [`nui-content__${name}`, ...(modifier ? [`nui-content__${name}--${modifier}`] : [])].join(' ');

const renderCell = (node: ElementNode) => {
  const { value } = node.attrs;

  return renderTag('td', { class: part('table-cell', typeof value === 'number' && 'number') }, [
    typeof value === 'boolean'
      ? renderTag('input', { type: 'checkbox', checked: value, disabled: true, tabindex: -1 })
      : cellText(value),
  ]);
};

const elementChildren = (node: ElementNode | undefined): readonly ElementNode[] =>
  (node?.content ?? []).filter(
    (child): child is ElementNode => child.kind === ContentNodeKind.Element,
  );

const plainCell = (value: AttrValue | undefined): string =>
  (typeof value === 'boolean' ? String(value).toUpperCase() : cellText(value)).replaceAll(
    CELL_BREAK,
    ' ',
  );

const plainLine = (cells: readonly ElementNode[], attr: string): string =>
  cells.map((cell) => plainCell(cell.attrs[attr])).join('\t');

const tablePlainText = (table: ElementNode): string => {
  const [head, body] = elementChildren(table);

  return [
    plainLine(elementChildren(head), 'name'),
    ...elementChildren(body).map((row) => plainLine(elementChildren(row), 'value')),
  ].join('\n');
};

export const TABLE_NODES: Readonly<Record<string, NodeSpec>> = {
  table: {
    group: 'block',
    atom: true,
    content: 'table_head table_body',
    plainText: tablePlainText,
    render: () =>
      renderTag('div', { class: part('table') }, [
        renderTag('table', { class: part('grid') }, [contentHole]),
      ]),
    parse: [{ tag: 'table', read: readContentTable }],
  },
  table_head: {
    content: 'table_column+',
    render: () => renderTag('thead', {}, [renderTag('tr', {}, [contentHole])]),
  },
  table_column: {
    content: 'table_option* table_filter?',
    attrs: {
      name: { default: '', verify: (value) => typeof value === 'string' },
      type: { default: 'text', verify: isType },
      width: { default: null, verify: isWidth },
      ...SORT_ATTRS,
    },
    render: (node) => {
      const width = widthOf(node.attrs.width);

      return renderTag(
        'th',
        {
          class: `${COLUMN} ${TYPE_PREFIX}${typeOf(node.attrs.type)}`,
          style: width === undefined ? null : `width: ${String(width)}px;`,
        },
        [
          renderTag('span', {}, [textOf(node.attrs.name)]),
          renderTag('datalist', {}, [contentHole]),
        ],
      );
    },
  },
  table_option: {
    attrs: { label: { verify: (value) => typeof value === 'string' && value !== '' } },
    render: (node) => renderTag('option', { value: textOf(node.attrs.label) }),
  },
  ...VIEW_NODES,
  table_body: { content: 'table_row*', render: () => renderTag('tbody') },
  table_row: { content: 'table_cell+', render: () => renderTag('tr') },
  table_cell: { attrs: { value: { default: null, verify: isCell } }, render: renderCell },
};

const columnOf = (node: ElementNode): NuiContentTableColumn => ({
  id: node.id,
  name: textOf(node.attrs.name),
  type: typeOf(node.attrs.type),
  width: widthOf(node.attrs.width),
  options: elementChildren(node).reduce<string[]>((found, child) => {
    if (child.type === NuiContentNodeType.TableOption) {
      found.push(textOf(child.attrs.label));
    }
    return found;
  }, []),
  filter: filterOf(node),
});

const heads = new WeakMap<ElementNode, readonly NuiContentTableColumn[]>();

const rowCache = new WeakMap<
  ElementNode,
  { readonly columns: readonly NuiContentTableColumn[]; readonly row: NuiContentTableRow }
>();

const tables = new WeakMap<ElementNode, NuiContentTableData>();

const columnsOf = (head: ElementNode | undefined): readonly NuiContentTableColumn[] => {
  if (head === undefined) {
    return [];
  }
  const known = heads.get(head) ?? elementChildren(head).map(columnOf);

  heads.set(head, known);
  return known;
};

const rowOf = (
  node: ElementNode,
  columns: readonly NuiContentTableColumn[],
): NuiContentTableRow => {
  const known = rowCache.get(node);

  if (known?.columns === columns) {
    return known.row;
  }
  const cells = elementChildren(node);

  const row = {
    id: node.id,
    cells: columns.map((column, index) => cellValueOf(cells[index]?.attrs.value, column.type)),
  };

  rowCache.set(node, { columns, row });
  return row;
};

export const contentTableData = (node: ElementNode): NuiContentTableData => {
  const known = tables.get(node);

  if (known !== undefined) {
    return known;
  }
  const [head, body] = elementChildren(node);
  const columns = columnsOf(head);

  const data = {
    id: node.id,
    columns,
    rows: elementChildren(body).map((row) => rowOf(row, columns)),
    sort: sortOf(elementChildren(head)),
  };

  tables.set(node, data);
  return data;
};
