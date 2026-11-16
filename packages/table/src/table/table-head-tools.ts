import { filterKindOf, filterOf } from './table-filter';
import { pinOf } from './table-layout';
import { sortOrderOf } from './table-sort';
import {
  NuiTablePin,
  type NuiTableColumn,
  type NuiTableFilters,
  type NuiTablePins,
  type NuiTableSize,
  type NuiTableSort,
} from './table.types';

export interface HeadTools {
  readonly grip: boolean;
  readonly sort: boolean;
  readonly order: number | undefined;
  readonly filter: boolean;
  readonly menu: boolean;
  readonly resizer: boolean;
  readonly pin: NuiTablePin | undefined;
}

export interface HeadFacts {
  readonly sort: NuiTableSort;
  readonly filters: NuiTableFilters;
  readonly pins: NuiTablePins;
  readonly menu: boolean;
  readonly opened: string | undefined;
}

export interface HeadFrame {
  readonly padX: number;
  readonly grid: number;
}

export interface FilterShownInput {
  readonly filterable: boolean;
  readonly filtered: boolean;
  readonly menu: boolean;
  readonly open: boolean;
}

const TOOL = 24;
const GAP = 4;
const RESIZE_EDGE = 5;
const ORDER_GAP = 2;
const ORDER_DIGIT = 6;
const SORT_MOST = 48;

const PAD_X: Readonly<Record<NuiTableSize, number>> = { sm: 8, md: 12, lg: 16 };

export const headFrameOf = (size: NuiTableSize, gridlines: boolean): HeadFrame => ({
  padX: PAD_X[size],
  grid: gridlines ? 1 : 0,
});

export const filterShown = (input: FilterShownInput): boolean =>
  input.filterable && (!input.menu || input.filtered || input.open);

export const headToolsOf = <T>(column: NuiTableColumn<T>, facts: HeadFacts): HeadTools => ({
  grip: column.reorderable !== false,
  sort: column.sortable !== false,
  order: sortOrderOf(facts.sort, column.key),
  filter: filterShown({
    filterable: filterKindOf(column) !== undefined,
    filtered: filterOf(facts.filters, column.key) !== undefined,
    menu: facts.menu,
    open: facts.opened === column.key,
  }),
  menu: facts.menu,
  resizer: column.resizable !== false,
  pin: pinOf(column, facts.pins),
});

const sortWidthOf = (order: number | undefined): number =>
  order === undefined
    ? TOOL
    : Math.min(SORT_MOST, TOOL + ORDER_GAP + ORDER_DIGIT * String(order).length);

const boxesOf = (tools: HeadTools): readonly number[] => [
  ...(tools.grip ? [TOOL] : []),
  0,
  ...(tools.sort ? [sortWidthOf(tools.order)] : []),
  ...(tools.filter ? [TOOL] : []),
  ...(tools.menu ? [TOOL] : []),
];

const linesOf = (pin: NuiTablePin | undefined, grid: number): number => {
  switch (pin) {
    case NuiTablePin.Start:
      return 1;
    case NuiTablePin.End:
      return 1 + grid;
    case undefined:
      return grid;
  }
};

const edgesOf = (tools: HeadTools, padX: number): number => {
  const button = tools.filter || tools.menu;
  const start = tools.grip ? GAP : padX;
  const end = button ? GAP : padX;
  const besideResizer = tools.pin === NuiTablePin.End ? tools.grip : button;
  const resizerRoom = tools.resizer && besideResizer ? RESIZE_EDGE : 0;

  return start + end + resizerRoom;
};

export const leastWidthOf = (tools: HeadTools, frame: HeadFrame): number => {
  const boxes = boxesOf(tools);
  const filled = boxes.reduce((sum, box) => sum + box, 0);

  return (
    linesOf(tools.pin, frame.grid) + edgesOf(tools, frame.padX) + filled + GAP * (boxes.length - 1)
  );
};
