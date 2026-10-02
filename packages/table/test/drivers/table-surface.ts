import { nextTick } from 'vue';

export interface CellPosition {
  readonly row: number;
  readonly col: number;
}

export interface KeyOptions {
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
}

const OWN_GRID = ':scope > .nui-table__grid';
const SURFACE_POINTER = 6;

export const numberAttribute = (element: Element | null | undefined, name: string): number =>
  Number(element?.getAttribute(name) ?? Number.NaN);

export const headRowsOf = (viewport: HTMLElement): number =>
  viewport.querySelectorAll(`${OWN_GRID} > .nui-table__header > [role="row"]`).length;

export const bodyRowsOf = (viewport: HTMLElement): HTMLElement[] => [
  ...viewport.querySelectorAll<HTMLElement>(`${OWN_GRID} > .nui-table__body > [role="row"]`),
];

export const rowAt = (viewport: HTMLElement, position: number): Element | null =>
  viewport.querySelector(
    `${OWN_GRID} > * > [role="row"][aria-rowindex="${position + headRowsOf(viewport) + 1}"]`,
  );

export const cellAt = (viewport: HTMLElement, position: number, col: number): HTMLElement | null =>
  rowAt(viewport, position)?.querySelector<HTMLElement>(`:scope > [aria-colindex="${col + 1}"]`) ??
  null;

export const cellPositionOf = (
  viewport: HTMLElement,
  cell: Element | null,
): CellPosition | undefined => {
  if (
    cell === null ||
    !cell.matches('.nui-table__cell') ||
    cell.closest('.nui-table__viewport') !== viewport
  ) {
    return undefined;
  }
  return {
    row: numberAttribute(cell.closest('[role="row"]'), 'aria-rowindex') - headRowsOf(viewport) - 1,
    col: numberAttribute(cell, 'aria-colindex') - 1,
  };
};

export const activeCellOf = (viewport: HTMLElement): CellPosition | undefined =>
  cellPositionOf(
    viewport,
    viewport.querySelector(`${OWN_GRID} > * > [role="row"] > .nui-table__cell[tabindex="0"]`),
  );

export const rangedCellsOf = (viewport: HTMLElement): number =>
  bodyRowsOf(viewport).reduce(
    (count, row) => count + row.querySelectorAll(':scope > .nui-table__cell--ranged').length,
    0,
  );

export const clickCellAt = async (cell: HTMLElement | null, options: KeyOptions): Promise<void> => {
  const init = {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerId: SURFACE_POINTER,
    pointerType: 'mouse',
    shiftKey: options.shift ?? false,
    ctrlKey: options.ctrl ?? false,
  };

  cell?.dispatchEvent(new PointerEvent('pointerdown', init));
  cell?.dispatchEvent(new MouseEvent('mousedown', init));
  cell?.focus();
  window.dispatchEvent(new PointerEvent('pointerup', init));
  cell?.dispatchEvent(new MouseEvent('click', init));
  await nextTick();
};

export const pressKey = async (
  target: Element,
  key: string,
  options: KeyOptions,
): Promise<void> => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      ctrlKey: options.ctrl ?? false,
      shiftKey: options.shift ?? false,
      altKey: options.alt ?? false,
      bubbles: true,
      cancelable: true,
    }),
  );

  await nextTick();
};
