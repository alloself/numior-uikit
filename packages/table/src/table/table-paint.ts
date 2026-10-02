import type { NuiTableCellStyle, TableCellPaint } from './table.types';

const EDGES = [
  ['top', '--_edge-top'],
  ['end', '--_edge-end'],
  ['bottom', '--_edge-bottom'],
  ['start', '--_edge-start'],
] as const;

const edgesOf = (borders: NuiTableCellStyle['borders']): Array<[string, string]> =>
  EDGES.flatMap(([side, name]) => {
    const edge = borders?.[side];

    return edge === undefined ? [] : [[name, edge]];
  });

export const paintOf = (style: NuiTableCellStyle | undefined): TableCellPaint | undefined => {
  if (style === undefined) {
    return undefined;
  }
  const { fill, color } = style;
  const edges = edgesOf(style.borders);

  return {
    class: [
      style.class,
      {
        'nui-table__cell--filled': fill !== undefined,
        'nui-table__cell--inked': color !== undefined,
        'nui-table__cell--edged': edges.length > 0,
      },
    ],
    style: {
      ...style.style,
      ...(fill === undefined ? {} : { '--_fill': fill }),
      ...(color === undefined ? {} : { '--_ink': color }),
      ...Object.fromEntries(edges),
    },
    align: style.align,
  };
};
