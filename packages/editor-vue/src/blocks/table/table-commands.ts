import {
  cellValueOf,
  contentTableData,
  filterAttrs,
  type NuiContentCellValue,
  type NuiContentTableFilter,
  type NuiContentTableSort,
  type NuiContentTableType,
} from '@numior/content';
import {
  insertBlock,
  nodeSize,
  type Command,
  type ElementNode,
  type NodeId,
  type Transaction,
} from '@numior/editor-core';

export interface TableCellChange {
  readonly row: NodeId;
  readonly column: NodeId;
  readonly value: NuiContentCellValue;
}

interface TableParts {
  readonly table: ElementNode;
  readonly head: ElementNode;
  readonly body: ElementNode;
}

const elementsOf = (node: ElementNode | undefined): readonly ElementNode[] =>
  (node?.content ?? []).filter((child): child is ElementNode => child.kind === 'element');

const partsOf = (tr: Transaction, id: NodeId): TableParts | undefined => {
  const table = tr.doc.byId(id);
  const [head, body] = elementsOf(table);

  return table?.type === 'table' && head !== undefined && body !== undefined
    ? { table, head, body }
    : undefined;
};

const element = (
  tr: Transaction,
  type: string,
  attrs: Readonly<Record<string, NuiContentCellValue>> = {},
  content: readonly ElementNode[] = [],
): ElementNode => tr.doc.schema.element(type, { id: tr.newId(), attrs, content });

const cell = (tr: Transaction, value: NuiContentCellValue = null): ElementNode =>
  element(tr, 'table_cell', { value });

const startOf = (tr: Transaction, node: ElementNode): number | undefined =>
  tr.doc.positionOf(node.id);

const childAt = (tr: Transaction, parent: ElementNode, index: number): number | undefined => {
  const children = elementsOf(parent);
  const child = children[index];
  const start = startOf(tr, parent);

  if (child !== undefined) {
    return startOf(tr, child);
  }
  return start === undefined || index !== children.length
    ? undefined
    : start + nodeSize(parent) - 1;
};

const insertAt = (
  tr: Transaction,
  parentId: NodeId,
  index: number,
  nodes: readonly ElementNode[],
): void => {
  const parent = tr.doc.byId(parentId);
  const pos = parent === undefined ? undefined : childAt(tr, parent, index);

  if (pos !== undefined) {
    tr.insert(pos, nodes);
  }
};

const remove = (tr: Transaction, node: ElementNode | undefined): void => {
  const pos = node === undefined ? undefined : startOf(tr, node);

  if (node !== undefined && pos !== undefined) {
    tr.delete(pos, pos + nodeSize(node));
  }
};

const moveChild = (tr: Transaction, parentId: NodeId, from: number, to: number): void => {
  const node = elementsOf(tr.doc.byId(parentId))[from];

  if (node !== undefined && from !== to) {
    remove(tr, node);
    insertAt(tr, parentId, to, [node]);
  }
};

const run =
  (id: NodeId, change: (tr: Transaction, parts: TableParts) => boolean): Command =>
  (state, dispatch) => {
    const tr = state.tr;
    const parts = partsOf(tr, id);

    if (parts === undefined || !change(tr, parts) || !tr.changed) {
      return false;
    }
    dispatch?.(tr);
    return true;
  };

const columnIndex = (parts: TableParts, column: NodeId): number =>
  elementsOf(parts.head).findIndex((child) => child.id === column);

const addOption = (tr: Transaction, id: NodeId, value: NuiContentCellValue): void => {
  const column = tr.doc.byId(id);

  const options = elementsOf(column)
    .filter((child) => child.type === 'table_option')
    .map((option) => option.attrs.label);

  if (column?.attrs.type === 'select' && typeof value === 'string' && !options.includes(value)) {
    insertAt(tr, id, options.length, [element(tr, 'table_option', { label: value })]);
  }
};

export const setTableCells = (id: NodeId, changes: readonly TableCellChange[]): Command =>
  run(id, (tr, parts) => {
    for (const change of changes) {
      const index = columnIndex(parts, change.column);
      const column = elementsOf(parts.head)[index];
      const target = elementsOf(tr.doc.byId(change.row))[index];
      const pos = target === undefined ? undefined : startOf(tr, target);

      if (column !== undefined && pos !== undefined) {
        tr.setNodeAttrs(pos, { value: change.value });
        addOption(tr, column.id, change.value);
      }
    }
    return true;
  });

const emptyRow = (tr: Transaction, parts: TableParts): ElementNode =>
  element(
    tr,
    'table_row',
    {},
    elementsOf(parts.head).map(() => cell(tr)),
  );

export const insertTableRows = (id: NodeId, at: number, count = 1): Command =>
  run(id, (tr, parts) => {
    insertAt(
      tr,
      parts.body.id,
      Math.min(Math.max(0, at), elementsOf(parts.body).length),
      Array.from({ length: count }, () => emptyRow(tr, parts)),
    );

    return true;
  });

export const deleteTableRows = (id: NodeId, rows: readonly NodeId[]): Command =>
  run(id, (tr, parts) => {
    const doomed = new Set(rows);

    for (const row of elementsOf(parts.body).filter((child) => doomed.has(child.id))) {
      remove(tr, tr.doc.byId(row.id));
    }
    return true;
  });

export const moveTableRow = (id: NodeId, row: NodeId, to: number): Command =>
  run(id, (tr, parts) => {
    const from = elementsOf(parts.body).findIndex((child) => child.id === row);

    if (from < 0) {
      return false;
    }
    moveChild(tr, parts.body.id, from, to);
    return true;
  });

export const insertTableColumn = (id: NodeId, at: number, name: string): Command =>
  run(id, (tr, parts) => {
    for (const row of elementsOf(parts.body)) {
      insertAt(tr, row.id, at, [cell(tr)]);
    }
    insertAt(tr, parts.head.id, at, [element(tr, 'table_column', { name, type: 'text' })]);
    return true;
  });

export const deleteTableColumn = (id: NodeId, column: NodeId): Command =>
  run(id, (tr, parts) => {
    const index = columnIndex(parts, column);

    if (index < 0 || elementsOf(parts.head).length < 2) {
      return false;
    }
    for (const row of elementsOf(parts.body)) {
      remove(tr, elementsOf(tr.doc.byId(row.id))[index]);
    }
    remove(tr, tr.doc.byId(column));
    return true;
  });

const setColumn = (
  tr: Transaction,
  column: NodeId,
  attrs: Readonly<Record<string, NuiContentCellValue>>,
): void => {
  const pos = tr.doc.positionOf(column);

  if (pos !== undefined) {
    tr.setNodeAttrs(pos, attrs);
  }
};

export const renameTableColumn = (id: NodeId, column: NodeId, name: string): Command =>
  run(id, (tr, parts) => {
    if (columnIndex(parts, column) < 0) {
      return false;
    }
    setColumn(tr, column, { name });
    return true;
  });

const distinct = (values: readonly NuiContentCellValue[]): readonly string[] => [
  ...new Set(values.filter((value): value is string => typeof value === 'string')),
];

export const retypeTableColumn = (id: NodeId, column: NodeId, type: NuiContentTableType): Command =>
  run(id, (tr, parts) => {
    const index = columnIndex(parts, column);
    const node = elementsOf(parts.head)[index];

    if (node === undefined || node.attrs.type === type) {
      return false;
    }

    const values = contentTableData(parts.table).rows.map((row) =>
      cellValueOf(row.cells[index] ?? null, type),
    );

    for (const [position, row] of elementsOf(parts.body).entries()) {
      const target = elementsOf(row)[index];
      const pos = target === undefined ? undefined : startOf(tr, target);

      if (pos !== undefined) {
        tr.setNodeAttrs(pos, { value: values[position] ?? null });
      }
    }
    for (const option of elementsOf(node)) {
      remove(tr, tr.doc.byId(option.id));
    }
    setColumn(tr, column, { type });

    if (type === 'select') {
      insertAt(
        tr,
        column,
        0,
        distinct(values).map((label) => element(tr, 'table_option', { label })),
      );
    }
    return true;
  });

export const orderTableColumns = (id: NodeId, order: readonly NodeId[]): Command =>
  run(id, (tr, parts) => {
    const current = elementsOf(parts.head).map((column) => column.id);

    const wanted = [
      ...order.filter((key) => current.includes(key)),
      ...current.filter((key) => !order.includes(key)),
    ];

    for (const [to, key] of wanted.entries()) {
      const from = elementsOf(tr.doc.byId(parts.head.id)).findIndex((child) => child.id === key);

      for (const row of elementsOf(parts.body)) {
        moveChild(tr, row.id, from, to);
      }
      moveChild(tr, parts.head.id, from, to);
    }
    return true;
  });

export const resizeTableColumns = (id: NodeId, widths: Readonly<Record<NodeId, number>>): Command =>
  run(id, (tr, parts) => {
    for (const column of elementsOf(parts.head)) {
      const width = widths[column.id];

      if (width !== undefined && width !== column.attrs.width) {
        setColumn(tr, column.id, { width: Math.round(width) });
      }
    }
    return true;
  });

export const sortTable = (id: NodeId, sort: readonly NuiContentTableSort[]): Command =>
  run(id, (tr, parts) => {
    for (const column of elementsOf(parts.head)) {
      const rank = sort.findIndex((entry) => entry.column === column.id);
      const direction = sort[rank]?.direction ?? null;
      const sortRank = rank < 0 ? null : rank + 1;

      if (column.attrs.sort !== direction || column.attrs.sortRank !== sortRank) {
        setColumn(tr, column.id, { sort: direction, sortRank });
      }
    }
    return true;
  });

export interface TableColumnFilter {
  readonly column: NodeId;
  readonly filter: NuiContentTableFilter;
}

const filterNode = (tr: Transaction, filter: NuiContentTableFilter): ElementNode =>
  tr.doc.schema.element('table_filter', {
    id: tr.newId(),
    attrs: filterAttrs(filter),
    content:
      filter.kind === 'set'
        ? filter.values.map((value) => element(tr, 'table_value', { value }))
        : [],
  });

export const filterTable = (id: NodeId, filters: readonly TableColumnFilter[]): Command =>
  run(id, (tr, parts) => {
    const known = contentTableData(parts.table).columns;

    for (const column of elementsOf(parts.head)) {
      const wanted = filters.find((entry) => entry.column === column.id)?.filter;
      const current = elementsOf(column).find((child) => child.type === 'table_filter');
      const before = known.find((entry) => entry.id === column.id)?.filter;

      if (JSON.stringify(before) === JSON.stringify(wanted)) {
        continue;
      }
      remove(tr, current === undefined ? undefined : tr.doc.byId(current.id));

      if (wanted !== undefined) {
        insertAt(tr, column.id, elementsOf(tr.doc.byId(column.id)).length, [
          filterNode(tr, wanted),
        ]);
      }
    }
    return true;
  });

export const insertTable = (names: readonly string[], rows: number): Command =>
  insertBlock((tr) =>
    element(tr, 'table', {}, [
      element(
        tr,
        'table_head',
        {},
        names.map((name) => element(tr, 'table_column', { name, type: 'text' })),
      ),
      element(
        tr,
        'table_body',
        {},
        Array.from({ length: rows }, () =>
          element(
            tr,
            'table_row',
            {},
            names.map(() => cell(tr)),
          ),
        ),
      ),
    ]),
  );
