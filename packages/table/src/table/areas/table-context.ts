import type { ComputedRef, EmitFn, ShallowRef, ShortEmitsToObject } from 'vue';
import type { VersionRead, VirtualList } from '@numior/primitives';
import type { TableEngine } from '../../engine';
import type { TableLayout } from '../table-layout';
import type { NuiTableMessages } from '../table.messages';
import type {
  NuiTableCellPosition,
  NuiTableCellSlot,
  NuiTableColumn,
  NuiTableEvents,
  NuiTableRanges,
  TableRowCells,
} from '../table.types';

export type TableEmit<T> = EmitFn<ShortEmitsToObject<NuiTableEvents<T>>>;

export interface TableShell<T> {
  readonly viewport: Readonly<ShallowRef<HTMLElement | null>>;
  readonly frame: Readonly<ShallowRef<HTMLElement | null>>;
  readonly emit: TableEmit<T>;
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
  readonly isRtl: () => boolean;
  readonly active: () => NuiTableCellPosition;
  readonly ranges: () => NuiTableRanges;
  readonly layout: () => TableLayout;
  readonly columnAt: (key: string) => NuiTableColumn<T>;
  readonly dataKeys: () => readonly string[];
  readonly dataOffset: () => number;
  readonly rowCells: () => TableRowCells;
  readonly textOf: (row: T, key: string) => string;
  readonly scopeOf: (row: T, position: number, key: string, pinned: boolean) => NuiTableCellSlot<T>;
  readonly headRows: () => number;
  readonly rowSize: () => number;
  readonly frozenRows: () => number;
  readonly rowWindow: () => VirtualList;
  readonly columnWindow: () => VirtualList;
}

export interface TableContext<T> extends TableShell<T> {
  readonly loading: () => boolean;
  readonly engine: Readonly<ShallowRef<TableEngine<T>>>;
  readonly revision: VersionRead;
  readonly pageStart: () => number;
  readonly bodyRows: () => number;
  readonly rowAtPosition: (position: number) => T | undefined;
  readonly rowAt: (position: number) => T;
  readonly rowFor: (visual: number) => T | undefined;
  readonly pinnedRows: () => number;
}
