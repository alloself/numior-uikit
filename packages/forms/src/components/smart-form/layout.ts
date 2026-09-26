export interface LayoutPlan {
  readonly areas: string | undefined;
  readonly columns: number;
  readonly order: readonly string[];
}

const ROW = /"([^"]*)"/g;

const NOT_IDENT = /[^\w-]/g;

const NO_LAYOUT: LayoutPlan = { areas: undefined, columns: 1, order: [] };

export const areaName = (name: string): string => name.replace(NOT_IDENT, '-');

export const parseLayout = (layout: string): string[][] =>
  [...layout.matchAll(ROW)].map(([, row = '']) => row.split(/\s+/).filter((cell) => cell !== ''));

const padded = (cells: readonly string[], columns: number): string[] => [
  ...cells,
  ...Array.from({ length: columns - cells.length }, () => '.'),
];

export const planLayout = (
  layout: string | undefined,
  visible: ReadonlySet<string>,
): LayoutPlan => {
  const rows = parseLayout(layout ?? '').filter((cells) => cells.some((cell) => visible.has(cell)));

  if (rows.length === 0) {
    return NO_LAYOUT;
  }

  const columns = Math.max(...rows.map((cells) => cells.length));

  return {
    areas: rows
      .map((cells) => padded(cells, columns).map((cell) => (visible.has(cell) ? cell : '.')))
      .map((cells) => `"${cells.join(' ')}"`)
      .join(' '),
    columns,
    order: [...new Set(rows.flat().filter((cell) => visible.has(cell)))],
  };
};

export const orderByArea = <E extends { readonly area: string }>(
  items: readonly E[],
  order: readonly string[],
): E[] => {
  const ranks = new Map(order.map((area, index) => [area, index]));

  return items
    .map((item, index) => ({ item, index, rank: ranks.get(item.area) ?? order.length }))
    .toSorted((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ item }) => item);
};
