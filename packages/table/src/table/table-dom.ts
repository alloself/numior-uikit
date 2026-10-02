const OWN_GRID = ':scope > .nui-table__grid';

export const OWN_BODY_ROWS = `${OWN_GRID} > .nui-table__body > [role="row"]`;

export const OWN_DATA_ROWS = `${OWN_GRID} > .nui-table__body > .nui-table__row--body`;

export const OWN_SPANNING_CELLS = `${OWN_DATA_ROWS} > [rowspan]`;

export const OWN_DETAIL_ROWS = `${OWN_GRID} > .nui-table__body > .nui-table__row--detail`;

export const OWN_HEAD_CELLS = `${OWN_GRID} > .nui-table__header > .nui-table__row--head > [role="columnheader"][aria-colindex]`;

export const OWN_ACTIVE_CELL = `${OWN_GRID} > * > .nui-table__row > .nui-table__cell--active`;

export const ownCellAt = (rowIndex: number, colIndex: number): string =>
  `${OWN_GRID} > * > [aria-rowindex="${rowIndex}"] > [aria-colindex="${colIndex}"]`;

export const DETAIL_CELL = 'nui-table__cell--detail';

export const ownDetailOf = (
  target: EventTarget | null,
  viewport: Element | null,
): Element | null => {
  const detail = target instanceof Element ? target.closest('.nui-table__detail') : null;

  return detail !== null && viewport?.contains(detail) === true ? detail : null;
};
