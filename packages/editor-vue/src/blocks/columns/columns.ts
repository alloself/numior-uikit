import {
  insertBlock,
  type ColumnTypes,
  type Command,
  type ElementNode,
  type NodeId,
  type Schema,
  type Transaction,
} from '@numior/editor-core';

export const COLUMN_TYPES: ColumnTypes = { columns: 'columns', column: 'column', most: 4 };

export const COLUMN_COUNTS = [2, 3, 4] as const;

const MIN_SHARE = 0.15;

export const hasColumns = (schema: Schema): boolean =>
  schema.nodes.has(COLUMN_TYPES.columns) && schema.nodes.has(COLUMN_TYPES.column);

const columnOf = (tr: Transaction): ElementNode =>
  tr.doc.schema.element(COLUMN_TYPES.column, {
    id: tr.newId(),
    content: [tr.doc.schema.element('paragraph', { id: tr.newId() })],
  });

export const insertColumns = (count: number): Command =>
  insertBlock((tr) =>
    tr.doc.schema.element(COLUMN_TYPES.columns, {
      id: tr.newId(),
      content: Array.from({ length: count }, () => columnOf(tr)),
    }),
  );

export const shareOf = (node: ElementNode | undefined): number =>
  typeof node?.attrs.width === 'number' ? node.attrs.width : 1;

const rounded = (value: number): number => Math.round(value * 100) / 100;

export const splitShares = (total: number, ratio: number): readonly [number, number] => {
  const clamped = Math.min(1 - MIN_SHARE, Math.max(MIN_SHARE, ratio));
  const first = rounded(total * clamped);

  return [first, rounded(total - first)];
};

export const setShares =
  (shares: readonly (readonly [NodeId, number])[]): Command =>
  (state, dispatch) => {
    const tr = state.tr;

    for (const [id, width] of shares) {
      const pos = state.doc.positionOf(id);

      if (pos === undefined) {
        return false;
      }
      tr.setNodeAttrs(pos, { width });
    }
    dispatch?.(tr);
    return true;
  };
