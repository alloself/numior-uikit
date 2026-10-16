import {
  contentHole,
  renderTag,
  type AttrValue,
  type ElementNode,
  type NodeSpec,
} from '@numior/editor-core';
import type {
  NuiContentCellValue,
  NuiContentSortDirection,
  NuiContentTableFilter,
  NuiContentTableSort,
  NuiContentTextFilterOp,
} from './content.types';
import { cellText } from './table-values';

const TEXT_OPS: readonly NuiContentTextFilterOp[] = ['contains', 'equals', 'starts', 'empty'];

const FILTER_KINDS: readonly NuiContentTableFilter['kind'][] = ['text', 'number', 'date', 'set'];

const isOp = (value: AttrValue | undefined): value is NuiContentTextFilterOp =>
  TEXT_OPS.some((op) => op === value);

const isDirection = (value: AttrValue | undefined): value is NuiContentSortDirection =>
  value === 'asc' || value === 'desc';

const orNull =
  (test: (value: AttrValue) => boolean) =>
  (value: AttrValue): boolean =>
    value === null || test(value);

const isNumber = (value: AttrValue): boolean => typeof value === 'number' && Number.isFinite(value);

const isText = (value: AttrValue): boolean => typeof value === 'string';

const numberOf = (value: AttrValue | undefined): number | null =>
  typeof value === 'number' ? value : null;

const textOf = (value: AttrValue | undefined): string | null =>
  typeof value === 'string' ? value : null;

const elementsOf = (node: ElementNode): readonly ElementNode[] =>
  node.content.filter((child): child is ElementNode => child.kind === 'element');

export const SORT_ATTRS = {
  sort: { default: null, verify: orNull(isDirection) },
  sortRank: {
    default: null,
    verify: orNull((value) => typeof value === 'number' && Number.isInteger(value) && value >= 1),
  },
} as const;

export const VIEW_NODES: Readonly<Record<string, NodeSpec>> = {
  table_filter: {
    content: 'table_value*',
    attrs: {
      kind: { verify: (value) => FILTER_KINDS.some((kind) => kind === value) },
      op: { default: null, verify: orNull(isOp) },
      text: { default: null, verify: orNull(isText) },
      min: { default: null, verify: orNull(isNumber) },
      max: { default: null, verify: orNull(isNumber) },
      from: { default: null, verify: orNull(isText) },
      to: { default: null, verify: orNull(isText) },
    },
    render: () =>
      renderTag('span', { class: 'nui-content__table-filter', hidden: true }, [contentHole]),
  },
  table_value: {
    attrs: { value: { default: null } },
    render: (node) => renderTag('span', {}, [cellText(node.attrs.value)]),
  },
};

const valuesOf = (node: ElementNode): readonly NuiContentCellValue[] =>
  elementsOf(node).map((value) => value.attrs.value ?? null);

const readFilter = (node: ElementNode): NuiContentTableFilter | undefined => {
  const { attrs } = node;

  switch (attrs.kind) {
    case 'text':
      return isOp(attrs.op)
        ? { kind: 'text', op: attrs.op, value: textOf(attrs.text) ?? '' }
        : undefined;
    case 'number':
      return { kind: 'number', min: numberOf(attrs.min), max: numberOf(attrs.max) };
    case 'date':
      return { kind: 'date', from: textOf(attrs.from), to: textOf(attrs.to) };
    case 'set':
      return { kind: 'set', values: valuesOf(node) };
    default:
      return undefined;
  }
};

export const filterOf = (column: ElementNode): NuiContentTableFilter | undefined => {
  const node = elementsOf(column).find((child) => child.type === 'table_filter');

  return node === undefined ? undefined : readFilter(node);
};

export const sortOf = (columns: readonly ElementNode[]): readonly NuiContentTableSort[] =>
  columns
    .flatMap((column) => {
      const { sort, sortRank } = column.attrs;

      return isDirection(sort)
        ? [
            {
              column: column.id,
              direction: sort,
              rank: typeof sortRank === 'number' ? sortRank : 1,
            },
          ]
        : [];
    })
    .toSorted((left, right) => left.rank - right.rank)
    .map(({ column, direction }) => ({ column, direction }));

export const filterAttrs = (filter: NuiContentTableFilter): Readonly<Record<string, AttrValue>> => {
  switch (filter.kind) {
    case 'text':
      return { kind: 'text', op: filter.op, text: filter.value };
    case 'number':
      return { kind: 'number', min: filter.min, max: filter.max };
    case 'date':
      return { kind: 'date', from: filter.from, to: filter.to };
    case 'set':
      return { kind: 'set' };
  }
};
