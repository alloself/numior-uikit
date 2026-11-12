import {
  contentHole,
  ContentNodeKind,
  renderTag,
  type AttrValue,
  type ElementNode,
  type NodeSpec,
  type RenderElement,
} from '@numior/editor-core';
import {
  NuiContentNodeType,
  NuiContentSortDirection,
  NuiContentTableFilterKind,
  type NuiContentCellValue,
  type NuiContentTableFilter,
  type NuiContentTableSort,
  type NuiContentTextFilterOp,
} from './content.types';
import { cellText } from './table-values';

const TEXT_OPS: readonly NuiContentTextFilterOp[] = ['contains', 'equals', 'starts', 'empty'];

const FILTER_KINDS: readonly NuiContentTableFilter['kind'][] = ['text', 'number', 'date', 'set'];

const isOp = (value: AttrValue | undefined): value is NuiContentTextFilterOp =>
  TEXT_OPS.some((op) => op === value);

const isDirection = (value: AttrValue | undefined): value is NuiContentSortDirection =>
  value === NuiContentSortDirection.Asc || value === NuiContentSortDirection.Desc;

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
  node.content.filter((child): child is ElementNode => child.kind === ContentNodeKind.Element);

export const SORT_ATTRS = {
  sort: { default: null, verify: orNull(isDirection) },
  sortRank: {
    default: null,
    verify: orNull((value) => typeof value === 'number' && Number.isInteger(value) && value >= 1),
  },
} as const;

const FILTER_CLASS = 'nui-content__table-filter';

const renderValue = (node: ElementNode): RenderElement =>
  renderTag('span', {}, [cellText(node.attrs.value)]);

export const renderFilter = (node: ElementNode): RenderElement =>
  renderTag('span', { class: FILTER_CLASS, hidden: true }, elementsOf(node).map(renderValue));

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
      exclude: { default: false, verify: (value) => typeof value === 'boolean' },
    },
    render: () => renderTag('span', { class: FILTER_CLASS, hidden: true }, [contentHole]),
  },
  table_value: {
    attrs: { value: { default: null } },
    render: renderValue,
  },
};

const valuesOf = (node: ElementNode): readonly NuiContentCellValue[] =>
  elementsOf(node).map((value) => value.attrs.value ?? null);

const readFilter = (node: ElementNode): NuiContentTableFilter | undefined => {
  const { attrs } = node;

  switch (attrs.kind) {
    case NuiContentTableFilterKind.Text:
      return isOp(attrs.op)
        ? { kind: 'text', op: attrs.op, value: textOf(attrs.text) ?? '' }
        : undefined;
    case NuiContentTableFilterKind.Number:
      return { kind: 'number', min: numberOf(attrs.min), max: numberOf(attrs.max) };
    case NuiContentTableFilterKind.Date:
      return { kind: 'date', from: textOf(attrs.from), to: textOf(attrs.to) };
    case NuiContentTableFilterKind.Set:
      return { kind: 'set', values: valuesOf(node), exclude: attrs.exclude === true };
    default:
      return undefined;
  }
};

export const filterOf = (column: ElementNode): NuiContentTableFilter | undefined => {
  const node = elementsOf(column).find((child) => child.type === NuiContentNodeType.TableFilter);

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
    case NuiContentTableFilterKind.Text:
      return { kind: 'text', op: filter.op, text: filter.value };
    case NuiContentTableFilterKind.Number:
      return { kind: 'number', min: filter.min, max: filter.max };
    case NuiContentTableFilterKind.Date:
      return { kind: 'date', from: filter.from, to: filter.to };
    case NuiContentTableFilterKind.Set:
      return { kind: 'set', exclude: filter.exclude };
  }
};
