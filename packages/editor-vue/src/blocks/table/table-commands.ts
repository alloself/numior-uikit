import {
  cellValueOf,
  contentTableData,
  filterAttrs,
  NuiContentNodeType,
  NuiContentTableFilterKind,
  NuiContentTableType,
  type NuiContentCellValue,
  type NuiContentTableFilter,
  type NuiContentTableSort,
} from '@numior/content';
import {
  ContentNodeKind,
  insertBlock,
  nodeSize,
  StepKind,
  type AttrValue,
  type Command,
  type ElementNode,
  type NodeId,
  type BlockMaker,
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

interface Written {
  readonly column: ElementNode;
  readonly value: NuiContentCellValue;
}

interface CellPlan {
  readonly marked: {
    readonly pos: number;
    readonly attrs: { readonly value: NuiContentCellValue };
  }[];
  readonly added: Map<NodeId, Map<string, NuiContentCellValue>>;
  readonly written: Written[];
}

interface RowEnd {
  readonly end: number;
  readonly cells: ReadonlyMap<string, NuiContentCellValue>;
}

export interface TableColumnFilter {
  readonly column: NodeId;
  readonly filter: NuiContentTableFilter;
}

const elementsOf = (node: ElementNode | undefined): readonly ElementNode[] =>
  (node?.content ?? []).filter(
    (child): child is ElementNode => child.kind === ContentNodeKind.Element,
  );

const partsOf = (tr: Transaction, id: NodeId): TableParts | undefined => {
  const table = tr.doc.byId(id);
  const [head, body] = elementsOf(table);

  return table?.type === NuiContentNodeType.Table && head !== undefined && body !== undefined
    ? { table, head, body }
    : undefined;
};

const element = (
  tr: BlockMaker,
  type: string,
  attrs: Readonly<Record<string, NuiContentCellValue>> = {},
  content: readonly ElementNode[] = [],
): ElementNode => tr.doc.schema.element(type, { id: tr.newId(), attrs, content });

const cell = (tr: BlockMaker, column: string, value: NuiContentCellValue): ElementNode =>
  element(tr, 'table_cell', { column, value });

const keyOf = (column: ElementNode | undefined): string | undefined =>
  typeof column?.attrs.key === 'string' ? column.attrs.key : undefined;

const cellOf = (row: ElementNode | undefined, key: string): ElementNode | undefined =>
  elementsOf(row).findLast((child) => child.attrs.column === key);

const freshKey = (tr: Transaction, head: ElementNode): string => {
  const taken = new Set(elementsOf(head).map(keyOf));
  let key = tr.newId();

  while (taken.has(key)) {
    key = tr.newId();
  }
  return key;
};

const newColumn = (tr: Transaction, head: ElementNode, name: string): ElementNode =>
  element(tr, 'table_column', { key: freshKey(tr, head), name, type: 'text' });

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
  const parent = tr.doc.byId(parentId);
  const node = elementsOf(parent)[from];
  const start = node === undefined ? undefined : startOf(tr, node);

  const target =
    parent === undefined || from === to ? undefined : childAt(tr, parent, to > from ? to + 1 : to);

  if (node !== undefined && start !== undefined && target !== undefined) {
    tr.maybeStep({ kind: StepKind.Move, from: start, to: start + nodeSize(node), target });
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

  const options = elementsOf(column).reduce<(AttrValue | undefined)[]>((found, child) => {
    if (child.type === NuiContentNodeType.TableOption) {
      found.push(child.attrs.label);
    }
    return found;
  }, []);

  if (
    column?.attrs.type === NuiContentTableType.Select &&
    typeof value === 'string' &&
    !options.includes(value)
  ) {
    insertAt(tr, id, options.length, [element(tr, 'table_option', { label: value })]);
  }
};

const planCells = (
  tr: Transaction,
  parts: TableParts,
  changes: readonly TableCellChange[],
): CellPlan => {
  const columns = new Map(elementsOf(parts.head).map((node) => [node.id, node]));
  const rows = new Map(elementsOf(parts.body).map((node) => [node.id, node]));

  return changes.reduce<CellPlan>(
    (plan, change) => {
      const node = columns.get(change.column);
      const key = keyOf(node);
      const row = rows.get(change.row);

      if (node === undefined || key === undefined || row === undefined) {
        return plan;
      }

      const target = cellOf(row, key);
      const pos = target === undefined ? undefined : startOf(tr, target);

      if (pos === undefined) {
        plan.added.set(row.id, (plan.added.get(row.id) ?? new Map()).set(key, change.value));
      } else {
        plan.marked.push({ pos, attrs: { value: change.value } });
      }
      plan.written.push({ column: node, value: change.value });
      return plan;
    },
    { marked: [], added: new Map(), written: [] },
  );
};

const rowEnds = (tr: Transaction, plan: CellPlan): RowEnd[] =>
  [...plan.added]
    .reduce<RowEnd[]>((ends, [id, cells]) => {
      const row = tr.doc.byId(id);
      const start = row === undefined ? undefined : startOf(tr, row);

      if (row !== undefined && start !== undefined) {
        ends.push({ end: start + nodeSize(row) - 1, cells });
      }
      return ends;
    }, [])
    .toSorted((left, right) => right.end - left.end);

export const setTableCells = (id: NodeId, changes: readonly TableCellChange[]): Command =>
  run(id, (tr, parts) => {
    const plan = planCells(tr, parts, changes);
    const ends = rowEnds(tr, plan);

    tr.setNodesMarkup(plan.marked);

    for (const { end, cells } of ends) {
      tr.insert(
        end,
        Array.from(cells, ([key, value]) => cell(tr, key, value)),
      );
    }
    for (const { column: node, value } of plan.written) {
      addOption(tr, node.id, value);
    }
    return true;
  });

const emptyRow = (tr: BlockMaker, keys: readonly (string | undefined)[]): ElementNode =>
  element(
    tr,
    'table_row',
    {},
    keys.flatMap((key) => (key === undefined ? [] : [cell(tr, key, null)])),
  );

export const insertTableRows = (id: NodeId, at: number, count = 1): Command =>
  run(id, (tr, parts) => {
    insertAt(
      tr,
      parts.body.id,
      Math.min(Math.max(0, at), elementsOf(parts.body).length),
      Array.from({ length: count }, () => emptyRow(tr, elementsOf(parts.head).map(keyOf))),
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
    insertAt(tr, parts.head.id, at, [newColumn(tr, parts.head, name)]);
    return true;
  });

export const deleteTableColumn = (id: NodeId, target: NodeId): Command =>
  run(id, (tr, parts) => {
    if (columnIndex(parts, target) < 0 || elementsOf(parts.head).length < 2) {
      return false;
    }
    remove(tr, tr.doc.byId(target));
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
    const node = elementsOf(parts.head)[columnIndex(parts, column)];
    const wanted = name.trim();

    if (node === undefined || wanted === '' || wanted === node.attrs.name) {
      return false;
    }
    setColumn(tr, column, { name: wanted });
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

    const key = keyOf(node) ?? '';

    tr.setNodesMarkup(
      elementsOf(parts.body).flatMap((row, position) => {
        const target = cellOf(row, key);
        const pos = target === undefined ? undefined : startOf(tr, target);

        return pos === undefined ? [] : [{ pos, attrs: { value: values[position] ?? null } }];
      }),
    );

    for (const option of elementsOf(node)) {
      remove(tr, tr.doc.byId(option.id));
    }
    setColumn(tr, column, { type });

    if (type === NuiContentTableType.Select) {
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

const filterNode = (tr: Transaction, filter: NuiContentTableFilter): ElementNode =>
  tr.doc.schema.element('table_filter', {
    id: tr.newId(),
    attrs: filterAttrs(filter),
    content:
      filter.kind === NuiContentTableFilterKind.Set
        ? filter.values.map((value) => element(tr, 'table_value', { value }))
        : [],
  });

export const filterTable = (id: NodeId, filters: readonly TableColumnFilter[]): Command =>
  run(id, (tr, parts) => {
    const known = contentTableData(parts.table).columns;

    for (const column of elementsOf(parts.head)) {
      const wanted = filters.find((entry) => entry.column === column.id)?.filter;

      const current = elementsOf(column).find(
        (child) => child.type === NuiContentNodeType.TableFilter,
      );

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
  insertBlock((tr) => {
    const keys = names.map(() => tr.newId());

    return element(tr, 'table', {}, [
      element(
        tr,
        'table_head',
        {},
        names.map((name, index) =>
          element(tr, 'table_column', { key: keys[index] ?? tr.newId(), name, type: 'text' }),
        ),
      ),
      element(
        tr,
        'table_body',
        {},
        Array.from({ length: rows }, () => emptyRow(tr, keys)),
      ),
    ]);
  });
