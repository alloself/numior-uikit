import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { createNuiConfig, type EdgePoint, type NuiConfigOptions } from '@numior/primitives';
import { promiseTimeout } from '@vueuse/core';
import { vi } from 'vite-plus/test';
import {
  markRaw,
  nextTick,
  ref,
  shallowRef,
  type Component,
  type Plugin,
  type Ref,
  type ShallowRef,
} from 'vue';
import { choosePageSize } from '../../../vue/test/support/page-size';
import { dismissPopoverNatively, TopLayerStubs } from '../../../vue/test/support/top-layer';
import { stubRowObserver, type RowObserverStub } from '../support/row-observer';
import {
  activeCellOf,
  bodyRowsOf,
  cellAt,
  cellPositionOf,
  clickCellAt,
  headRowsOf,
  numberAttribute,
  pressKey,
  rangedCellsOf,
  rowAt,
  type CellPosition,
  type KeyOptions,
} from './table-surface';
import TableHost from '../fixtures/TableHost.vue';
import {
  type TableNodeId,
  type TableSort,
  type NuiTableFilters,
  type NuiTableExposed,
  type NuiTableHidden,
  type NuiTablePins,
  type NuiTableWidths,
  type NuiTableColumnOrder,
  type NuiTableColumnResize,
  type NuiTableReorderEvent,
  type NuiTableDraft,
  type NuiTableEditEvent,
  type NuiTableEditMode,
  type NuiTableEditMove,
  type NuiTableEditRefusal,
  type NuiTableStartEditOptions,
  type NuiTableCsvOptions,
  type NuiTableProps,
  type NuiTableColumnDef,
  type NuiTableRange,
  type NuiTableRanges,
  type NuiTableRect,
  type NuiTableRowHeights,
  type NuiTableWindow,
  type NuiTableCellPosition,
} from '../../src';

export interface EditorLayout {
  readonly widths: readonly number[];
  readonly visible: number;
  readonly glyph: number;
}

export interface TableMountOptions<T> {
  readonly columns: readonly NuiTableColumnDef<T>[];
  readonly rows: readonly T[];
  readonly props?: Omit<NuiTableProps<T>, 'columns' | 'rows'>;
  readonly sort?: readonly TableSort[];
  readonly filters?: NuiTableFilters;
  readonly groupBy?: readonly string[];
  readonly expanded?: readonly TableNodeId[];
  readonly pins?: NuiTablePins;
  readonly hidden?: NuiTableHidden;
  readonly widths?: NuiTableWidths;
  readonly columnOrder?: NuiTableColumnOrder;
  readonly rowHeights?: NuiTableRowHeights;
  readonly active?: NuiTableCellPosition;
  readonly selected?: readonly T[];
  readonly page?: number;
  readonly pageSize?: number;
  readonly slots?: TableSlotViews;
  readonly width?: number;
  readonly onEdit?: (event: NuiTableEditEvent<T>) => void;
  readonly height?: number;
  readonly auto?: boolean;
  readonly dir?: 'ltr' | 'rtl';
  readonly config?: NuiConfigOptions;
}

type MountDefaults = Required<
  Pick<
    TableMountOptions<never>,
    | 'sort'
    | 'filters'
    | 'groupBy'
    | 'expanded'
    | 'pins'
    | 'hidden'
    | 'widths'
    | 'columnOrder'
    | 'width'
    | 'height'
    | 'dir'
  >
>;

interface TableStubs {
  readonly layers: TopLayerStubs;
  readonly observers: RowObserverStub;
}

interface TableWindowFrameText {
  readonly lead: string;
  readonly rest: string;
  readonly clampStart: string;
  readonly clampEnd: string;
}

export interface SelectAllState {
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly disabled: boolean;
}

export type TableSlotViews = Readonly<Record<string, Component>>;

interface TableModels<T> {
  readonly sort: ShallowRef<readonly TableSort[]>;
  readonly filters: ShallowRef<NuiTableFilters>;
  readonly quick: ShallowRef<string>;
  readonly groupBy: ShallowRef<readonly string[]>;
  readonly expanded: ShallowRef<readonly TableNodeId[]>;
  readonly pins: ShallowRef<NuiTablePins>;
  readonly hidden: ShallowRef<NuiTableHidden>;
  readonly widths: ShallowRef<NuiTableWidths>;
  readonly columnOrder: ShallowRef<NuiTableColumnOrder>;
  readonly selected: ShallowRef<readonly T[]>;
  readonly page: ShallowRef<number>;
  readonly pageSize: ShallowRef<number>;
  readonly ranges: Ref<NuiTableRanges>;
  readonly rowHeights: ShallowRef<NuiTableRowHeights>;
  readonly active: ShallowRef<NuiTableCellPosition | undefined>;
  readonly draft: ShallowRef<NuiTableDraft | undefined>;
}

type TableProps<T> = Omit<NuiTableProps<T>, 'columns' | 'rows'>;

export interface TableHostState<T> extends TableModels<T> {
  readonly rows: ShallowRef<readonly T[]>;
  readonly props: ShallowRef<TableProps<T>>;
}

export interface TableHostListeners<T> {
  readonly onRowClick: (row: T) => void;
  readonly onReorder: (event: NuiTableReorderEvent<T>) => void;
  readonly onColumnResize: (changes: readonly NuiTableColumnResize[]) => void;
  readonly onWindow: (next: NuiTableWindow) => void;
  readonly onPick: (range: NuiTableRange) => void;
  readonly onEditRefused: (event: NuiTableEditRefusal<T>) => void;
  readonly onError: (error: unknown) => void;
  readonly onEdit: (event: NuiTableEditEvent<T>) => void;
  readonly onSettle: () => void;
  readonly onProgress: () => void;
  readonly onLoad: (row: T) => void;
}

interface TableEvents<T> {
  settled: number;
  progress: number;
  readonly loads: T[];
  readonly clicks: T[];
  readonly reorders: NuiTableReorderEvent<T>[];
  readonly resizes: (readonly NuiTableColumnResize[])[];
  readonly edits: NuiTableEditEvent<T>[];
  readonly refusals: NuiTableEditRefusal<T>[];
  readonly errors: unknown[];
  readonly windows: NuiTableWindow[];
  readonly picks: NuiTableRange[];
  readonly waiters: Array<() => void>;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

type DropSide = 'before' | 'after' | 'inside';

interface DropMark {
  readonly kind: 'line' | 'box';
  readonly start: string;
  readonly size?: string | undefined;
  readonly inset?: string | undefined;
}

const PANE_NAME = /^nui-table__pane--(?!frozen$|cols-)/;

const MOUNT_DEFAULTS: MountDefaults = {
  sort: [],
  filters: [],
  groupBy: [],
  expanded: [],
  pins: {},
  hidden: [],
  widths: {},
  columnOrder: [],
  width: 500,
  height: 300,
  dir: 'ltr',
};

const pluginsOf = (config: NuiConfigOptions | undefined): Plugin[] =>
  config === undefined ? [] : [createNuiConfig(config)];

export type { CellPosition, KeyOptions } from './table-surface';

const defineValue = (element: HTMLElement, name: string, value: number): void => {
  Object.defineProperty(element, name, { value, configurable: true, writable: true });
};

const LAYOUT_WIDTH = 4000;
const LAYOUT_HEIGHT = 300;
const HEAD_HEIGHT = 40;
const GRAB_NUDGE = 10;

const dragHandle = async (handle: HTMLElement | null, name: string, dx: number): Promise<void> => {
  if (handle === null) {
    throw new Error(`${name} has no resize handle`);
  }

  handle.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, clientX: 100 }),
  );

  window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 100 + dx }));
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 100 + dx }));
  await nextTick();
};

const RANGE_POINTER = 4;

const pointerInit = (point: Point, options: KeyOptions): PointerEventInit => ({
  bubbles: true,
  cancelable: true,
  button: 0,
  pointerId: RANGE_POINTER,
  pointerType: 'mouse',
  clientX: point.x,
  clientY: point.y,
  shiftKey: options.shift ?? false,
  ctrlKey: options.ctrl ?? false,
});

const ROW_EARLY = 10;
const ROW_MIDDLE = 20;
const ROW_LATE = 30;

const withPointHits = <R>(hits: (x: number, y: number) => Element[], run: () => R): R => {
  const own = Object.getOwnPropertyDescriptor(document, 'elementsFromPoint');

  Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: hits });

  try {
    return run();
  } finally {
    if (own === undefined) {
      Reflect.deleteProperty(document, 'elementsFromPoint');
    } else {
      Object.defineProperty(document, 'elementsFromPoint', own);
    }
  }
};

const defineRect = (element: Element, rect: DOMRect): void => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => rect,
    configurable: true,
  });
};

const PAINT_PROPERTIES = [
  ['fill', '--_fill'],
  ['color', '--_ink'],
  ['top', '--_edge-top'],
  ['end', '--_edge-end'],
  ['bottom', '--_edge-bottom'],
  ['start', '--_edge-start'],
  ['spill', '--_spill'],
  ['line', '--_spill-line'],
  ['bar', '--_bar'],
  ['barColor', '--_bar-color'],
] as const;

const PAINT_MARKS = [
  'filled',
  'inked',
  'edged',
  'barred',
  'tail',
  'clip',
  'spill',
  'seamless',
] as const;

const ALIGN_PREFIX = 'nui-table__cell--align-';

const alignOf = (cell: Element): string =>
  [...cell.classList].find((name) => name.startsWith(ALIGN_PREFIX))?.replace(ALIGN_PREFIX, '') ??
  '';

const spanOf = (cell: Element): [rows: number, cols: number] =>
  cell instanceof HTMLTableCellElement ? [cell.rowSpan, cell.colSpan] : [1, 1];

const widthOf = (tracks: readonly number[], from: number, count: number): number =>
  tracks.slice(from, from + count).reduce((sum, width) => sum + width, 0);

const freeTrack = (busy: ReadonlySet<number> | undefined, from: number): number => {
  let track = from;

  while (busy?.has(track) === true) {
    track += 1;
  }
  return track;
};

const occupy = (
  taken: Map<number, Set<number>>,
  rowIndex: number,
  rows: number,
  track: number,
  cols: number,
): void => {
  for (let below = 1; below < rows; below += 1) {
    const busy = taken.get(rowIndex + below) ?? new Set<number>();

    for (let at = track; at < track + cols; at += 1) {
      busy.add(at);
    }
    taken.set(rowIndex + below, busy);
  }
};

const SPAN_PROPERTIES = ['--_span-x', '--_span-y', '--_span-w', '--_span-h'] as const;
const MERGE_MARK = /^nui-table__cell--(?:tall|allied|cut-\w+)$/u;

const isExposed = (value: unknown): value is NuiTableExposed =>
  typeof value === 'object' &&
  value !== null &&
  'scrollToRow' in value &&
  typeof value.scrollToRow === 'function' &&
  'scrollToColumn' in value &&
  typeof value.scrollToColumn === 'function';

const DETAIL_CONTROLS = 'button, input, a[href]';
const IDLE_WAIT = 100;

const nextFrame = (): Promise<number> =>
  new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });

const nameOf = (control: Element): string =>
  control.getAttribute('aria-label') ?? control.textContent?.trim() ?? '';

export class TableDriver<T> {
  static mount<T>(options: TableMountOptions<T>): TableDriver<T> {
    const settings = { ...MOUNT_DEFAULTS, ...options };
    const source = shallowRef(settings.rows);
    const sort = shallowRef<readonly TableSort[]>(settings.sort);
    const filters = shallowRef<NuiTableFilters>(settings.filters);
    const quick = shallowRef('');
    const groupBy = shallowRef<readonly string[]>(settings.groupBy);
    const expanded = shallowRef<readonly TableNodeId[]>(settings.expanded);
    const pins = shallowRef<NuiTablePins>(settings.pins);
    const hidden = shallowRef<NuiTableHidden>(settings.hidden);
    const widths = shallowRef<NuiTableWidths>(settings.widths);
    const columnOrder = shallowRef<NuiTableColumnOrder>(settings.columnOrder);
    const selected = shallowRef<readonly T[]>(settings.selected ?? []);
    const page = shallowRef(settings.page ?? 1);
    const pageSize = shallowRef(settings.pageSize ?? 20);
    const ranges = ref<NuiTableRanges>([]);
    const rowHeights = shallowRef<NuiTableRowHeights>(settings.rowHeights ?? {});
    const active = shallowRef<NuiTableCellPosition | undefined>(settings.active);
    const draft = shallowRef<NuiTableDraft>();

    const props = shallowRef<TableProps<T>>({
      ...(settings.auto === true ? {} : { height: `${settings.height}px` }),
      ...settings.props,
    });

    const stubs = new TopLayerStubs();
    const observers = stubRowObserver();
    const exposed = shallowRef<NuiTableExposed | null>(null);

    const events: TableEvents<T> = {
      settled: 0,
      progress: 0,
      loads: [],
      clicks: [],
      reorders: [],
      resizes: [],
      edits: [],
      refusals: [],
      errors: [],
      windows: [],
      picks: [],
      waiters: [],
    };

    const setExposed = (value: unknown): void => {
      exposed.value = isExposed(value) ? value : null;
    };

    const listeners: TableHostListeners<T> = {
      onRowClick: (row) => {
        events.clicks.push(row);
      },
      onReorder: (event) => {
        events.reorders.push(event);
      },
      onColumnResize: (changes) => {
        events.resizes.push(changes);
      },
      onWindow: (next) => {
        events.windows.push(next);
      },
      onPick: (range) => {
        events.picks.push(range);
      },
      onEditRefused: (event) => {
        events.refusals.push(event);
      },
      onError: (error) => {
        events.errors.push(error);
      },
      onEdit: (event) => {
        events.edits.push(event);
        settings.onEdit?.(event);
      },
      onSettle: () => {
        events.settled += 1;

        for (const resolve of events.waiters.splice(0)) {
          resolve();
        }
      },
      onProgress: () => {
        events.progress += 1;
      },
      onLoad: (row) => {
        events.loads.push(row);
      },
    };

    const models = {
      sort,
      filters,
      quick,
      groupBy,
      expanded,
      pins,
      hidden,
      widths,
      columnOrder,
      selected,
      page,
      pageSize,
      ranges,
      rowHeights,
      active,
      draft,
    };

    const wrapper = mount(TableHost<T>, {
      props: {
        columns: settings.columns,
        state: { ...models, rows: source, props },
        listeners,
        dir: settings.dir,
        slots: markRaw({ ...settings.slots }),
        onTable: setExposed,
      },
      attachTo: document.body,
      global: { plugins: pluginsOf(settings.config) },
    });

    const driver = new TableDriver<T>(wrapper, source, props, models, exposed, events, {
      layers: stubs,
      observers,
    });

    driver.size(settings.width, settings.height);
    return driver;
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly source: ShallowRef<readonly T[]>,
    private readonly props: ShallowRef<TableProps<T>>,
    private readonly models: TableModels<T>,
    private readonly exposed: ShallowRef<NuiTableExposed | null>,
    private readonly events: TableEvents<T>,
    private readonly stubs: TableStubs,
  ) {}

  private nextSettle(): Promise<void> {
    return new Promise((resolve) => {
      this.events.waiters.push(resolve);
    });
  }

  private get element(): HTMLElement {
    return this.viewport.element;
  }

  private size(width: number, height: number): void {
    defineValue(this.element, 'clientWidth', width);
    defineValue(this.element, 'clientHeight', height);
    defineValue(this.element, 'scrollTop', 0);
    defineValue(this.element, 'scrollLeft', 0);
    this.element.dispatchEvent(new Event('scroll'));
  }

  get viewport(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-table__viewport');
  }

  private get grid(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-table__grid');
  }

  get rowCount(): number {
    return numberAttribute(this.grid.element, 'aria-rowcount');
  }

  get colCount(): number {
    return numberAttribute(this.grid.element, 'aria-colcount');
  }

  get label(): string | undefined {
    return this.grid.attributes('aria-label');
  }

  get scrollTop(): number {
    return this.element.scrollTop;
  }

  get scrollLeft(): number {
    return this.element.scrollLeft;
  }

  private get headRows(): number {
    return headRowsOf(this.element);
  }

  get renderedRows(): number[] {
    return bodyRowsOf(this.element).map(
      (row) => numberAttribute(row, 'aria-rowindex') - this.headRows - 1,
    );
  }

  get headerTexts(): string[] {
    return this.wrapper
      .findAll('.nui-table__row--head [role="columnheader"]')
      .map((cell) => cell.text());
  }

  get bands(): string[][] {
    return this.wrapper
      .findAll('.nui-table__row--band')
      .map((row) =>
        row
          .findAll('[role="columnheader"]')
          .map(
            (cell) =>
              `${cell.text()}:${cell.attributes('aria-colindex')}+${cell.attributes('aria-colspan')}`,
          ),
      );
  }

  get auto(): boolean {
    return this.wrapper.find('.nui-table').classes('nui-table--auto');
  }

  get fluid(): boolean {
    return this.wrapper.find('.nui-table').classes('nui-table--fluid');
  }

  get gridlines(): boolean {
    return this.wrapper.find('.nui-table').classes('nui-table--gridlines');
  }

  get slack(): boolean {
    return this.wrapper.find('.nui-table').classes('nui-table--slack');
  }

  get readingText(): boolean {
    return this.wrapper.find('.nui-table').classes('nui-table--reading');
  }

  async resize(width: number): Promise<void> {
    defineValue(this.element, 'clientWidth', width);
    defineRect(this.element, new DOMRect(0, 0, width, LAYOUT_HEIGHT));
    this.stubs.observers.deliver([this.element]);
    await nextTick();
  }

  cellPaint(position: number, col: number): Record<string, string> {
    const cell = this.cell(position, col);

    if (cell === null) {
      return {};
    }
    return Object.fromEntries([
      ...PAINT_PROPERTIES.flatMap(([name, property]) => {
        const value = cell.style.getPropertyValue(property);

        return value === '' ? [] : [[name, value]];
      }),
      ['align', alignOf(cell)],
    ]);
  }

  spillText(position: number, col: number): string | undefined {
    return this.cell(position, col)?.querySelector('.nui-table__spill')?.textContent ?? undefined;
  }

  cellIcon(position: number, col: number): { color: string; filled: boolean } | undefined {
    const icon = this.cell(position, col)?.querySelector<HTMLElement>('.nui-table__icon');

    return icon === null || icon === undefined
      ? undefined
      : {
          color: icon.style.getPropertyValue('--_icon-color'),
          filled: icon.querySelector('.nui-icon--filled') !== null,
        };
  }

  cellMarks(position: number, col: number): string[] {
    const cell = this.cell(position, col);

    return PAINT_MARKS.filter(
      (mark) => cell?.classList.contains(`nui-table__cell--${mark}`) === true,
    );
  }

  bandTails(level: number): boolean[] {
    const row = this.wrapper.findAll('.nui-table__row--band')[level];

    return (row?.findAll('th') ?? []).map((cell) => cell.classes('nui-table__cell--tail'));
  }

  cellWraps(position: number, col: number): boolean {
    return this.cell(position, col)?.classList.contains('nui-table__cell--wrap') ?? false;
  }

  bandSpans(level: number): number[] {
    const row = this.wrapper.findAll('.nui-table__row--band')[level];

    return (row?.findAll('th') ?? []).map((cell) => Number(cell.attributes('colspan') ?? 1));
  }

  bandRules(level: number): Array<string | undefined> {
    const row = this.wrapper.findAll('.nui-table__row--band')[level];

    return (row?.findAll('th') ?? []).map((cell) =>
      [...cell.element.classList]
        .find((name) => name.startsWith('nui-table__cell--rule-'))
        ?.replace('nui-table__cell--rule-', ''),
    );
  }

  bandCell(label: string): HTMLElement | null {
    return (
      [
        ...this.element.querySelectorAll<HTMLElement>(
          '.nui-table__row--band [role="columnheader"]',
        ),
      ].find((cell) => cell.textContent?.trim() === label) ?? null
    );
  }

  bandResizer(label: string): HTMLElement | null {
    return this.bandCell(label)?.querySelector<HTMLElement>('.nui-table__resizer') ?? null;
  }

  async dragBandResizer(label: string, dx: number): Promise<void> {
    await dragHandle(this.bandResizer(label), `band ${label}`, dx);
  }

  get activeCell(): CellPosition | undefined {
    return activeCellOf(this.element);
  }

  get focusedCell(): CellPosition | undefined {
    return cellPositionOf(this.element, document.activeElement);
  }

  get sort(): readonly TableSort[] {
    return this.models.sort.value;
  }

  get filters(): NuiTableFilters {
    return this.models.filters.value;
  }

  get expanded(): readonly TableNodeId[] {
    return this.models.expanded.value;
  }

  get pins(): NuiTablePins {
    return this.models.pins.value;
  }

  get hidden(): NuiTableHidden {
    return this.models.hidden.value;
  }

  get widths(): NuiTableWidths {
    return this.models.widths.value;
  }

  get columnOrder(): NuiTableColumnOrder {
    return this.models.columnOrder.value;
  }

  get selected(): readonly T[] {
    return this.models.selected.value;
  }

  get page(): number {
    return this.models.page.value;
  }

  get pageSize(): number {
    return this.models.pageSize.value;
  }

  get paginated(): boolean {
    return this.wrapper.find('.nui-table__pagination').exists();
  }

  get rangeText(): string | undefined {
    const range = this.wrapper.find('.nui-pagination__range');
    return range.exists() ? range.text() : undefined;
  }

  async nextPage(): Promise<void> {
    await this.wrapper.find('.nui-pagination__next').trigger('click');
    await nextTick();
  }

  async choosePageSize(size: number): Promise<void> {
    await choosePageSize(this.wrapper, size);
  }

  get clicks(): readonly T[] {
    return this.events.clicks;
  }

  get multiselectable(): boolean {
    return this.grid.attributes('aria-multiselectable') === 'true';
  }

  get skeletonRows(): number {
    return this.wrapper.findAll('.nui-table__row--skeleton').length;
  }

  get captionText(): string | undefined {
    const caption = this.wrapper.find('.nui-table__caption');
    return caption.exists() ? caption.text() : undefined;
  }

  get captionId(): string | undefined {
    const caption = this.wrapper.find('.nui-table__caption');
    return caption.exists() ? caption.attributes('id') : undefined;
  }

  chevron(position: number): Element | null {
    return this.row(position)?.querySelector('.nui-table__toggle--expandable') ?? null;
  }

  get labelledBy(): string | undefined {
    return this.grid.attributes('aria-labelledby');
  }

  private selectInput(position: number): HTMLInputElement | null {
    return (
      this.row(position)?.querySelector<HTMLInputElement>('.nui-table__cell--select input') ?? null
    );
  }

  get headerCheckbox(): SelectAllState | undefined {
    const input = this.selectInput(-1);

    return input === null
      ? undefined
      : { checked: input.checked, indeterminate: input.indeterminate, disabled: input.disabled };
  }

  get selectAllLabel(): string | undefined {
    return this.selectInput(-1)?.getAttribute('aria-label') ?? undefined;
  }

  selectLabel(position: number): string | undefined {
    return this.selectInput(position)?.getAttribute('aria-label') ?? undefined;
  }

  rowSelected(position: number): boolean | undefined {
    const value = this.row(position)?.getAttribute('aria-selected');
    return value === null || value === undefined ? undefined : value === 'true';
  }

  rowChecked(position: number): boolean {
    return this.selectInput(position)?.checked ?? false;
  }

  rowPinned(position: number): boolean {
    return this.row(position)?.classList.contains('nui-table__row--pinned') ?? false;
  }

  rowOdd(position: number): boolean {
    return this.row(position)?.classList.contains('nui-table__row--odd') ?? false;
  }

  rowFrozen(position: number): string | undefined {
    const row = this.row(position);

    return row instanceof HTMLElement && row.classList.contains('nui-table__row--frozen')
      ? row.style.getPropertyValue('--_top')
      : undefined;
  }

  get frozenSize(): string {
    return this.wrapper.find<HTMLElement>('.nui-table').element.style.getPropertyValue('--_frozen');
  }

  async checkRow(position: number): Promise<void> {
    this.selectInput(position)?.click();
    await nextTick();
  }

  async checkAll(): Promise<void> {
    this.selectInput(-1)?.click();
    await nextTick();
  }

  async clickRow(position: number, col: number): Promise<void> {
    this.cell(position, col)?.click();
    await nextTick();
  }

  async receive(next: Partial<TableProps<T>>): Promise<void> {
    this.props.value = { ...this.props.value, ...next };
    await nextTick();
  }

  get loads(): readonly T[] {
    return this.events.loads;
  }

  rowBusy(position: number): boolean {
    return this.row(position)?.getAttribute('aria-busy') === 'true';
  }

  treeLevel(position: number): string | undefined {
    const tree = this.row(position)?.querySelector<HTMLElement>('.nui-table__tree');
    return tree?.style.getPropertyValue('--_level');
  }

  get role(): string | undefined {
    return this.grid.attributes('role');
  }

  rowLevel(position: number): string | undefined {
    return this.row(position)?.getAttribute('aria-level') ?? undefined;
  }

  rowExpanded(position: number): string | undefined {
    return this.row(position)?.getAttribute('aria-expanded') ?? undefined;
  }

  groupLabel(position: number): string | undefined {
    const group = this.row(position)?.querySelector('.nui-table__group');

    if (group === null || group === undefined) {
      return undefined;
    }
    return [...group.querySelectorAll('.nui-table__text, .nui-table__count')]
      .map((part) => part.textContent?.trim() ?? '')
      .join(' ');
  }

  private get popover(): HTMLElement | null {
    return document.querySelector<HTMLElement>('.nui-table-filter');
  }

  get filterTitle(): string | undefined {
    return this.popover?.querySelector('.nui-table-filter__title')?.textContent?.trim();
  }

  get filterFocused(): boolean {
    return this.popover?.contains(document.activeElement) ?? false;
  }

  get filterValueLabels(): string[] {
    return [...(this.popover?.querySelectorAll('.nui-table-filter__values label') ?? [])].map(
      (label) => label.textContent?.trim() ?? '',
    );
  }

  private get columnMenu(): HTMLElement | null {
    return (
      this.element
        .closest('.nui-table')
        ?.querySelector<HTMLElement>(':scope > .nui-menu:not(.nui-table__cell-menu)') ?? null
    );
  }

  private get cellMenu(): HTMLElement | null {
    return (
      this.element
        .closest('.nui-table')
        ?.querySelector<HTMLElement>(':scope > .nui-table__cell-menu') ?? null
    );
  }

  private cellMenuEntries(): HTMLElement[] {
    return [...(this.cellMenu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  }

  get cellMenuFocused(): boolean {
    return this.cellMenu?.contains(document.activeElement) ?? false;
  }

  get cellMenuLabels(): string[] {
    return this.cellMenuEntries().map(
      (entry) => entry.querySelector('.nui-menu-item__label')?.textContent?.trim() ?? '',
    );
  }

  cellMenuDisabled(label: string): boolean {
    return (
      this.cellMenuEntries()
        .find(
          (entry) => entry.querySelector('.nui-menu-item__label')?.textContent?.trim() === label,
        )
        ?.getAttribute('aria-disabled') === 'true'
    );
  }

  async closeCellMenu(): Promise<void> {
    if (this.cellMenu !== null) {
      dismissPopoverNatively(this.cellMenu);
    }
    await nextTick();
  }

  async chooseCellMenu(label: string): Promise<void> {
    this.cellMenuEntries()
      .find((entry) => entry.querySelector('.nui-menu-item__label')?.textContent?.trim() === label)
      ?.click();

    await flushPromises();
  }

  private menuEntries(): HTMLElement[] {
    const root = this.columnMenu;

    return [
      ...(root?.querySelectorAll<HTMLElement>(
        '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
      ) ?? []),
    ];
  }

  private menuEntry(label: string): HTMLElement | undefined {
    return this.menuEntries().find(
      (entry) => entry.querySelector('.nui-menu-item__label')?.textContent?.trim() === label,
    );
  }

  get menuLabels(): string[] {
    const root = this.columnMenu;

    return this.menuEntries().reduce<string[]>((found, entry) => {
      if (entry.closest('.nui-menu') === root) {
        found.push(entry.querySelector('.nui-menu-item__label')?.textContent?.trim() ?? '');
      }
      return found;
    }, []);
  }

  get focusedMenuItem(): string | undefined {
    const active = document.activeElement;
    return active instanceof HTMLElement && this.columnMenu?.contains(active)
      ? active.querySelector('.nui-menu-item__label')?.textContent?.trim()
      : undefined;
  }

  menuItemState(label: string): string | undefined {
    const entry = this.menuEntry(label);
    return entry?.getAttribute('aria-checked') ?? entry?.getAttribute('aria-disabled') ?? undefined;
  }

  menuExpanded(col: number): boolean {
    return (
      this.header(col)?.querySelector('.nui-table__menu')?.getAttribute('aria-expanded') === 'true'
    );
  }

  async openColumnMenu(col: number): Promise<void> {
    this.header(col)?.querySelector<HTMLElement>('.nui-table__menu')?.click();
    await nextTick();
  }

  async chooseMenu(label: string): Promise<void> {
    this.menuEntry(label)?.click();
    await nextTick();
  }

  async chooseMenuAndSettle(label: string): Promise<void> {
    const settled = this.nextSettle();

    this.menuEntry(label)?.click();
    await settled;
    await nextTick();
  }

  filterButton(col: number): HTMLElement | null {
    return this.header(col)?.querySelector<HTMLElement>('.nui-table__filter') ?? null;
  }

  filterActive(col: number): boolean {
    return this.filterButton(col)?.classList.contains('nui-table__filter--active') ?? false;
  }

  filterExpanded(col: number): boolean {
    return this.filterButton(col)?.getAttribute('aria-expanded') === 'true';
  }

  get filterSearchable(): boolean {
    return this.filterInput('Поиск') !== undefined;
  }

  get filterNote(): string | undefined {
    return this.popover?.querySelector('.nui-table-filter__note')?.textContent?.trim();
  }

  get filterChosenLabels(): string[] {
    return [
      ...(this.popover?.querySelectorAll<HTMLElement>('.nui-table-filter__values label') ?? []),
    ].flatMap((entry) =>
      entry.querySelector<HTMLInputElement>('input')?.checked === true
        ? [entry.textContent?.trim() ?? '']
        : [],
    );
  }

  get filterAllState(): 'all' | 'some' | 'none' | undefined {
    const input = this.allValuesInput;

    if (input === null || input === undefined) {
      return undefined;
    }
    if (input.indeterminate) {
      return 'some';
    }
    return input.checked ? 'all' : 'none';
  }

  private get allValuesInput(): HTMLInputElement | null | undefined {
    return [...(this.popover?.querySelectorAll<HTMLElement>('label') ?? [])]
      .find((entry) => entry.textContent?.trim() === 'Выбрать все')
      ?.querySelector<HTMLInputElement>('input');
  }

  filterValue(label: string): string | undefined {
    return this.filterInput(label)?.value;
  }

  private filterInput(label: string): HTMLInputElement | undefined {
    const inputs = this.popover?.querySelectorAll<HTMLInputElement>('input') ?? [];

    return [...inputs].find((input) =>
      [...(input.labels ?? [])].some((entry) => entry.textContent?.trim() === label),
    );
  }

  get settledRuns(): number {
    return this.events.settled;
  }

  get progressReports(): number {
    return this.events.progress;
  }

  get announcement(): string {
    return this.wrapper.find('[role="status"]').text();
  }

  get reorders(): readonly NuiTableReorderEvent<T>[] {
    return this.events.reorders;
  }

  get resizes(): readonly (readonly NuiTableColumnResize[])[] {
    return this.events.resizes;
  }

  get edits(): readonly NuiTableEditEvent<T>[] {
    return this.events.edits;
  }

  get refusals(): readonly NuiTableEditRefusal<T>[] {
    return this.events.refusals;
  }

  get errors(): readonly unknown[] {
    return this.events.errors;
  }

  get windows(): readonly NuiTableWindow[] {
    return this.events.windows;
  }

  get picks(): readonly NuiTableRange[] {
    return this.events.picks;
  }

  get overlayMarks(): Array<Record<'top' | 'start' | 'width' | 'height', string>> {
    return [...this.element.querySelectorAll<HTMLElement>('.nui-table__plane > *')].map((mark) => ({
      top: mark.style.insetBlockStart,
      start: mark.style.insetInlineStart,
      width: mark.style.inlineSize,
      height: mark.style.blockSize,
    }));
  }

  get planeLead(): string {
    return (
      this.element
        .querySelector<HTMLElement>('.nui-table__overlay')
        ?.style.getPropertyValue('--_plane-lead') ?? ''
    );
  }

  get paneMarks(): string[] {
    return [...this.element.querySelectorAll<HTMLElement>('.nui-table__pane')].flatMap((pane) => {
      const name = [...pane.classList]
        .find((label) => PANE_NAME.test(label))
        ?.slice('nui-table__pane--'.length);

      return [...pane.querySelectorAll<HTMLElement>('.nui-table__plane > *')].map(
        (mark) => `${name ?? ''} ${mark.style.insetBlockStart} ${mark.style.insetInlineStart}`,
      );
    });
  }

  get scrollPosition(): { readonly top: number; readonly left: number } | undefined {
    return this.exposed.value?.scrollPosition();
  }

  async focusCellAt(position: NuiTableCellPosition, scroll: boolean): Promise<void> {
    this.exposed.value?.focusCell(position, scroll);
    await nextTick();
  }

  rectOf(range: NuiTableRange): NuiTableRect | undefined {
    return this.exposed.value?.rectOf(range);
  }

  cellAtPoint(position: number, col: number): NuiTableCellPosition | undefined {
    const cell = this.cell(position, col);

    return withPointHits(
      () => (cell === null ? [] : [cell.firstElementChild ?? cell, cell]),
      () => this.exposed.value?.cellFromPoint(0, 0),
    );
  }

  pointNear(x: number, y: number): EdgePoint | undefined {
    let probed: EdgePoint | undefined;

    defineRect(
      this.element,
      new DOMRect(0, 0, this.element.clientWidth, this.element.clientHeight),
    );

    withPointHits(
      (px, py) => {
        probed = { x: px, y: py };
        return [];
      },
      () => this.exposed.value?.cellNear(x, y),
    );

    return probed;
  }

  async followEdge(
    x: number,
    y: number,
  ): Promise<{ readonly scrollTop: number; readonly steps: number }> {
    let steps = 0;

    defineRect(
      this.element,
      new DOMRect(0, 0, this.element.clientWidth, this.element.clientHeight),
    );

    this.exposed.value?.followEdge(x, y, () => {
      steps += 1;
    });

    await nextFrame();

    const scrolled = { scrollTop: this.element.scrollTop, steps };

    this.exposed.value?.stopEdge();
    return scrolled;
  }

  get pendingRows(): number {
    return this.element.querySelectorAll('.nui-table__body > [role="row"][aria-busy="true"]')
      .length;
  }

  async refresh(): Promise<void> {
    this.exposed.value?.refresh();
    await nextTick();
  }

  async paste(text: string, html = ''): Promise<void> {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    const parts: Readonly<Record<string, string>> = { 'text/plain': text, 'text/html': html };

    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (type: string) => parts[type] ?? '' },
    });

    (document.activeElement ?? this.element).dispatchEvent(event);
    await nextTick();
  }

  private get editorElement(): HTMLElement | null {
    return this.element.querySelector<HTMLElement>('.nui-table__editor');
  }

  private get editorField(): HTMLInputElement | null {
    return this.editorElement?.querySelector<HTMLInputElement>('input') ?? null;
  }

  get editing(): CellPosition | undefined {
    return cellPositionOf(this.element, this.editorElement?.closest('.nui-table__cell') ?? null);
  }

  get editorGrows(): boolean {
    return this.editorElement?.classList.contains('nui-table__editor--grow') === true;
  }

  get editorSize(): number | undefined {
    const size = this.editorElement?.style.getPropertyValue('--_size') ?? '';

    return size === '' ? undefined : Number.parseFloat(size);
  }

  get editorLifted(): boolean {
    return (this.editorElement?.style.getPropertyValue('--_lift') ?? '') !== '';
  }

  layEditorOut(layout: EditorLayout): void {
    const editor = this.editorElement;
    const field = this.editorField;
    const cell = editor?.closest<HTMLElement>('.nui-table__cell');
    const viewport = editor?.closest<HTMLElement>('.nui-table__viewport');

    if (
      !(editor instanceof HTMLElement) ||
      !(cell instanceof HTMLElement) ||
      !(viewport instanceof HTMLElement) ||
      field === null
    ) {
      return;
    }
    const cells = [...(cell.parentElement?.children ?? [])];
    const back = cell.classList.contains('nui-table__cell--align-end');

    cells.reduce((left, sibling, index) => {
      const width = layout.widths[index] ?? 0;

      defineRect(sibling, new DOMRect(left, 0, width, HEAD_HEIGHT));
      return left + width;
    }, 0);

    defineRect(viewport, new DOMRect(0, 0, layout.visible, LAYOUT_HEIGHT));
    defineValue(viewport, 'clientWidth', layout.visible);
    defineValue(viewport, 'offsetWidth', layout.visible);

    const laidWidth = (): number => this.editorSize ?? cell.getBoundingClientRect().width;

    Object.defineProperty(editor, 'getBoundingClientRect', {
      configurable: true,
      value: () => {
        const box = cell.getBoundingClientRect();
        const width = laidWidth();

        return new DOMRect(back ? box.right - width : box.left, 0, width, HEAD_HEIGHT);
      },
    });

    Object.defineProperty(field, 'clientWidth', { configurable: true, get: laidWidth });

    Object.defineProperty(field, 'scrollWidth', {
      configurable: true,
      get: () => Math.max(laidWidth(), field.value.length * layout.glyph),
    });
  }

  get editorValue(): string | undefined {
    return this.editorField?.value;
  }

  get editorLabel(): string | undefined {
    return this.editorField?.getAttribute('aria-label') ?? undefined;
  }

  get editorFocused(): boolean {
    return this.editorElement?.contains(document.activeElement) === true;
  }

  get editorError(): string | undefined {
    const id =
      this.editorField?.getAttribute('aria-invalid') === 'true'
        ? this.editorField.getAttribute('aria-errormessage')
        : null;

    return id === null ? undefined : document.getElementById(id)?.textContent?.trim();
  }

  async typeInEditor(text: string): Promise<void> {
    const field = this.editorField;

    if (field !== null) {
      field.value = text;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await nextTick();
  }

  get editorExpanded(): string | undefined {
    return (
      this.editorElement?.querySelector('[aria-haspopup]')?.getAttribute('aria-expanded') ??
      undefined
    );
  }

  get editorOptions(): string[] {
    return [...(this.editorElement?.querySelectorAll('[role="option"]') ?? [])].map(
      (option) => option.textContent?.trim() ?? '',
    );
  }

  async pickInEditor(label: string): Promise<void> {
    const option = [
      ...(this.editorElement?.querySelectorAll<HTMLElement>('[role="option"]') ?? []),
    ].find((element) => element.textContent?.trim() === label);

    option?.click();
    await nextTick();
  }

  async clickEditor(): Promise<void> {
    const field = this.editorField;

    field?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    field?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    field?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
    field?.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await nextTick();
  }

  async doubleClickCell(position: number, col: number): Promise<void> {
    this.layoutBody();
    const point = this.pointAt(position, col);
    const cell = this.cell(position, col);

    this.pressDown(cell, point, {});
    window.dispatchEvent(new PointerEvent('pointerup', pointerInit(point, {})));
    cell?.dispatchEvent(new MouseEvent('click', pointerInit(point, {})));
    cell?.dispatchEvent(new MouseEvent('dblclick', { ...pointerInit(point, {}), detail: 2 }));
    await nextTick();
  }

  async doubleTapCell(position: number, col: number): Promise<void> {
    this.layoutBody();
    const cell = this.cell(position, col);
    const tap = { ...pointerInit(this.pointAt(position, col), {}), pointerType: 'touch' };

    cell?.focus();

    for (const detail of [1, 2]) {
      cell?.dispatchEvent(new PointerEvent('pointerup', tap));
      cell?.dispatchEvent(new MouseEvent('click', { ...tap, detail }));
    }
    await nextTick();
  }

  get dropMark(): DropMark | undefined {
    const box = this.wrapper.find<HTMLElement>('.nui-table__drop--box');

    if (box.exists()) {
      return {
        kind: 'box',
        start: box.element.style.getPropertyValue('--_drop'),
        size: box.element.style.getPropertyValue('--_size'),
      };
    }
    const line = this.wrapper.find<HTMLElement>('.nui-table__drop--y');

    return line.exists()
      ? {
          kind: 'line',
          start: line.element.style.getPropertyValue('--_drop'),
          inset: line.element.style.getPropertyValue('--_drop-inset'),
        }
      : undefined;
  }

  get ghostSize(): string | undefined {
    const ghost = this.wrapper.find<HTMLElement>('.nui-table__ghost--y');

    return ghost.exists() ? ghost.element.style.getPropertyValue('--_size') : undefined;
  }

  get ghostText(): string | undefined {
    const ghost = this.wrapper.find('.nui-table__ghost--y');
    return ghost.exists() ? ghost.text() : undefined;
  }

  rowGrip(position: number): HTMLButtonElement | null {
    return this.row(position)?.querySelector<HTMLButtonElement>('.nui-table__row-grip') ?? null;
  }

  gripColumn(position: number): number | undefined {
    const cell = this.rowGrip(position)?.closest('[aria-colindex]');
    return cell === null || cell === undefined
      ? undefined
      : Number(cell.getAttribute('aria-colindex'));
  }

  private layoutRows(): void {
    const frame = this.wrapper.find<HTMLElement>('.nui-table__frame').element;

    defineRect(frame, new DOMRect(0, 0, LAYOUT_WIDTH, LAYOUT_HEIGHT));

    for (const row of this.element.querySelectorAll<HTMLElement>(
      '.nui-table__body > [role="row"]',
    )) {
      const top = (Number(row.getAttribute('aria-rowindex')) - 1) * HEAD_HEIGHT;

      defineRect(row, new DOMRect(0, top, LAYOUT_WIDTH, HEAD_HEIGHT));

      if (!row.firstElementChild) {
        continue;
      }

      defineRect(row.firstElementChild, new DOMRect(0, top, LAYOUT_WIDTH, HEAD_HEIGHT));
    }
  }

  get ranges(): NuiTableRanges {
    return this.models.ranges.value;
  }

  rangeMarks(position: number, col: number): string[] {
    const cell = this.cell(position, col);

    const marks = [...(cell?.classList ?? [])].filter((name) =>
      name.startsWith('nui-table__cell--range'),
    );

    return [
      ...(cell?.getAttribute('aria-selected') === 'true' ? ['selected'] : []),
      ...marks.map((name) => name.replace('nui-table__cell--', '')),
    ];
  }

  private layoutBody(): void {
    const tracks = [...this.element.querySelectorAll<HTMLElement>('colgroup > col')].map(
      (track) => Number.parseFloat(track.style.inlineSize) || 0,
    );

    const frame = this.wrapper.find<HTMLElement>('.nui-table__frame').element;

    defineRect(
      this.element,
      new DOMRect(0, 0, this.element.clientWidth, this.element.clientHeight),
    );

    defineRect(frame, new DOMRect(0, 0, this.element.clientWidth, this.element.clientHeight));

    const taken = new Map<number, Set<number>>();

    for (const row of this.element.querySelectorAll('.nui-table__body > [role="row"]')) {
      const rowIndex = Number(row.getAttribute('aria-rowindex'));
      let track = 0;

      for (const cell of row.children) {
        const [rows, cols] = spanOf(cell);

        track = freeTrack(taken.get(rowIndex), track);

        defineRect(
          cell,
          new DOMRect(
            widthOf(tracks, 0, track),
            (rowIndex - 1) * HEAD_HEIGHT,
            widthOf(tracks, track, cols),
            HEAD_HEIGHT * rows,
          ),
        );

        occupy(taken, rowIndex, rows, track, cols);
        track += cols;
      }
    }
  }

  private pointAt(position: number, col: number): Point {
    const rect = this.cell(position, col)?.getBoundingClientRect();

    if (rect === undefined) {
      throw new Error(`No cell at ${position}:${col}`);
    }
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  private pressDown(cell: HTMLElement | null, start: Point, options: KeyOptions): void {
    cell?.dispatchEvent(new PointerEvent('pointerdown', pointerInit(start, options)));

    const pressed = new MouseEvent('mousedown', pointerInit(start, options));

    cell?.dispatchEvent(pressed);

    if (pressed.defaultPrevented) {
      return;
    }

    cell?.focus();
  }

  async dragRange(from: CellPosition, to: CellPosition, options: KeyOptions = {}): Promise<void> {
    this.layoutBody();
    const start = this.pointAt(from.row, from.col);
    const end = this.pointAt(to.row, to.col);

    this.pressDown(this.cell(from.row, from.col), start, options);
    window.dispatchEvent(new PointerEvent('pointermove', pointerInit(end, options)));
    window.dispatchEvent(new PointerEvent('pointerup', pointerInit(end, options)));
    this.cell(to.row, to.col)?.dispatchEvent(new MouseEvent('click', pointerInit(end, options)));
    await nextTick();
  }

  private headPoint(col: number): Point {
    const rect = this.cell(0, col)?.getBoundingClientRect();

    if (rect === undefined) {
      throw new Error(`No column ${col}`);
    }
    return { x: rect.left + rect.width / 2, y: HEAD_HEIGHT / 2 };
  }

  async pressHeader(col: number, options: KeyOptions = {}): Promise<void> {
    this.layoutBody();
    const point = this.headPoint(col);
    const head = this.header(col);

    this.pressDown(head, point, options);
    window.dispatchEvent(new PointerEvent('pointerup', pointerInit(point, options)));
    head?.dispatchEvent(new MouseEvent('click', pointerInit(point, options)));
    await nextTick();
  }

  async dragHeaders(from: number, to: number): Promise<void> {
    this.layoutBody();
    const end = this.headPoint(to);

    this.pressDown(this.header(from), this.headPoint(from), {});
    window.dispatchEvent(new PointerEvent('pointermove', pointerInit(end, {})));
    window.dispatchEvent(new PointerEvent('pointerup', pointerInit(end, {})));
    await nextTick();
  }

  async tapCell(position: number, col: number): Promise<void> {
    const cell = this.cell(position, col);
    const init = { bubbles: true, cancelable: true, button: 0, pointerType: 'touch' };

    cell?.dispatchEvent(new PointerEvent('pointerdown', init));
    cell?.dispatchEvent(new PointerEvent('pointerup', init));
    cell?.dispatchEvent(new MouseEvent('click', init));
    await nextTick();
  }

  get rowHeights(): NuiTableRowHeights {
    return this.models.rowHeights.value;
  }

  rowHeight(position: number): string {
    const row = this.row(position);

    return row instanceof HTMLElement ? row.style.getPropertyValue('--_row') : '';
  }

  rowBodySize(position: number): string[] {
    const row = this.row(position);

    return row instanceof HTMLElement
      ? [row.style.getPropertyValue('--_body-size'), row.style.getPropertyValue('--_body-min')]
      : [];
  }

  get canvasHeight(): number {
    const frame = this.windowFrame;

    const rows = this.rowElements.reduce(
      (sum, row) => sum + (Number.parseFloat(row.style.getPropertyValue('--_row')) || HEAD_HEIGHT),
      0,
    );

    return frame === undefined
      ? rows
      : Number.parseFloat(frame.lead) + Number.parseFloat(frame.rest) + rows;
  }

  rowResizer(position: number): HTMLElement | null {
    return this.row(position)?.querySelector<HTMLElement>('.nui-table__resizer--row') ?? null;
  }

  async dragRowResizer(position: number, dy: number): Promise<void> {
    const handle = this.rowResizer(position);

    if (handle === null) {
      throw new Error(`Row ${position} has no resize handle`);
    }

    handle.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 2, clientY: 100 }),
    );

    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, clientY: 100 + dy }));
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, clientY: 100 + dy }));
    await nextTick();
  }

  async resetRowHeight(position: number): Promise<void> {
    this.rowResizer(position)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextTick();
  }

  cellSpan(position: number, col: number): number[] {
    const cell = this.cell(position, col);

    return cell instanceof HTMLTableCellElement
      ? [cell.rowSpan, cell.colSpan, numberAttribute(cell, 'aria-colspan')]
      : [];
  }

  cellSpread(position: number, col: number): string[] {
    const cell = this.cell(position, col);

    return cell === null
      ? []
      : SPAN_PROPERTIES.map((property) => cell.style.getPropertyValue(property));
  }

  cellMerged(position: number, col: number): boolean {
    return this.cell(position, col)?.classList.contains('nui-table__cell--merged') ?? false;
  }

  mergeMarks(position: number, col: number): string[] {
    return [...(this.cell(position, col)?.classList ?? [])].reduce<string[]>((found, name) => {
      if (MERGE_MARK.test(name)) {
        found.push(name.replace('nui-table__cell--', ''));
      }
      return found;
    }, []);
  }

  cellRole(position: number, col: number): string | undefined {
    return this.cell(position, col)?.getAttribute('role') ?? undefined;
  }

  cellMarked(position: number, col: number): boolean {
    return this.cell(position, col)?.classList.contains('nui-table__cell--marked') ?? false;
  }

  get markedHeaders(): number[] {
    return [...this.element.querySelectorAll('.nui-table__row--head > .nui-table__cell--marked')]
      .map((cell) => numberAttribute(cell, 'aria-colindex') - 1)
      .toSorted((a, b) => a - b);
  }

  async blur(): Promise<void> {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await nextTick();
  }

  hasModifier(name: string): boolean {
    return this.element.closest('.nui-table')?.classList.contains(`nui-table--${name}`) ?? false;
  }

  async pressOutside(className = 'outside'): Promise<void> {
    const target = document.createElement('button');

    target.className = className;
    document.body.append(target);
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    target.remove();
    await nextTick();
  }

  selectText(position: number, col: number): void {
    const cell = this.cell(position, col);

    if (cell === null) {
      return;
    }

    window.getSelection()?.selectAllChildren(cell);
  }

  get textSelection(): string {
    return window.getSelection()?.toString() ?? '';
  }

  async pressCell(position: number, col: number): Promise<void> {
    this.layoutBody();
    this.pressDown(this.cell(position, col), this.pointAt(position, col), {});

    window.dispatchEvent(
      new PointerEvent('pointerup', pointerInit(this.pointAt(position, col), {})),
    );

    await nextTick();
  }

  async releaseOnCell(position: number, col: number): Promise<void> {
    this.cell(position, col)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
  }

  async clickCell(position: number, col: number, options: KeyOptions = {}): Promise<void> {
    this.layoutBody();
    const point = this.pointAt(position, col);
    const cell = this.cell(position, col);

    this.pressDown(cell, point, options);
    window.dispatchEvent(new PointerEvent('pointerup', pointerInit(point, options)));
    cell?.dispatchEvent(new MouseEvent('click', pointerInit(point, options)));
    await nextTick();
  }

  async openCellMenu(position: number, col: number): Promise<boolean> {
    this.layoutBody();
    const point = this.pointAt(position, col);
    const event = new MouseEvent('contextmenu', { ...pointerInit(point, {}), button: 2 });

    this.cell(position, col)?.dispatchEvent(event);
    await nextTick();
    return event.defaultPrevented;
  }

  async holdCell(position: number, col: number, ms: number): Promise<void> {
    this.layoutBody();
    const point = this.pointAt(position, col);

    this.cell(position, col)?.dispatchEvent(
      new PointerEvent('pointerdown', { ...pointerInit(point, {}), pointerType: 'touch' }),
    );

    await vi.advanceTimersByTimeAsync(ms);
  }

  gripDisabled(position: number): boolean {
    return this.rowGrip(position)?.disabled ?? true;
  }

  rowDragging(position: number): boolean {
    return (
      this.row(this.pinnedShown + position)?.classList.contains('nui-table__row--dragging') ?? false
    );
  }

  private get pinnedShown(): number {
    return this.element.querySelectorAll('.nui-table__pinned > [role="row"]').length;
  }

  private rowY(position: number, side: DropSide): number {
    const top = (this.headRows + this.pinnedShown + position) * HEAD_HEIGHT;

    switch (side) {
      case 'before':
        return top + ROW_EARLY;
      case 'after':
        return top + ROW_LATE;
      case 'inside':
        return top + ROW_MIDDLE;
    }
  }

  async grabRow(position: number): Promise<void> {
    const grip = this.rowGrip(this.pinnedShown + position);

    if (grip === null) {
      throw new Error(`Row ${position} has no drag grip`);
    }
    const y = this.rowY(position, 'before') + GRAB_NUDGE;

    this.layoutRows();

    grip.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 3, clientY: y }),
    );

    window.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 3, clientY: y + GRAB_NUDGE }),
    );

    await nextTick();
  }

  async moveRowTo(position: number, side: DropSide): Promise<void> {
    this.layoutRows();

    window.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 3, clientY: this.rowY(position, side) }),
    );

    await nextTick();
  }

  async dropRow(): Promise<void> {
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3 }));
    await nextTick();
  }

  get busy(): boolean {
    return this.grid.attributes('aria-busy') === 'true';
  }

  get sortOrders(): string[] {
    return this.wrapper.findAll('.nui-table__sort-order').map((order) => order.text());
  }

  ariaSort(col: number): string | undefined {
    return this.header(col)?.getAttribute('aria-sort') ?? undefined;
  }

  sortable(col: number): boolean {
    return this.header(col)?.classList.contains('nui-table__cell--sortable') ?? false;
  }

  private header(col: number): HTMLElement | null {
    return this.element.querySelector<HTMLElement>(
      `.nui-table__row--head [role="columnheader"][aria-colindex="${col + 1}"]`,
    );
  }

  get emptyText(): string | undefined {
    const empty = this.wrapper.find('.nui-table__empty');
    return empty.exists() ? empty.text() : undefined;
  }

  private row(position: number): Element | null {
    return rowAt(this.element, position);
  }

  cell(position: number, col: number): HTMLElement | null {
    return cellAt(this.element, position, col);
  }

  cellText(position: number, col: number): string | undefined {
    return this.cell(position, col)?.textContent?.trim();
  }

  private detail(position: number): HTMLElement | null {
    return (
      this.row(position)?.querySelector<HTMLElement>(
        ':scope > .nui-table__cell--detail > .nui-table__detail',
      ) ?? null
    );
  }

  detailText(position: number): string | undefined {
    return this.detail(position)?.querySelector('p')?.textContent?.trim();
  }

  get details(): number[] {
    return bodyRowsOf(this.element).reduce<number[]>((found, row) => {
      if (row.classList.contains('nui-table__row--detail')) {
        found.push(numberAttribute(row, 'aria-rowindex') - this.headRows - 1);
      }
      return found;
    }, []);
  }

  detailSpan(position: number): string | undefined {
    return this.cell(position, 0)?.getAttribute('aria-colspan') ?? undefined;
  }

  private detailControl(position: number, name: string): HTMLElement | undefined {
    return [...(this.detail(position)?.querySelectorAll<HTMLElement>(DETAIL_CONTROLS) ?? [])].find(
      (control) => nameOf(control) === name,
    );
  }

  async focusInDetail(position: number, name: string): Promise<void> {
    this.detailControl(position, name)?.focus();
    await nextTick();
  }

  async clickInDetail(position: number, name: string): Promise<void> {
    const control = this.detailControl(position, name);
    const point = { x: 0, y: 0 };

    this.pressDown(control ?? null, point, {});
    control?.dispatchEvent(new PointerEvent('pointerup', pointerInit(point, {})));
    control?.dispatchEvent(new MouseEvent('click', pointerInit(point, {})));
    control?.dispatchEvent(new MouseEvent('dblclick', { ...pointerInit(point, {}), detail: 2 }));
    await nextTick();
  }

  async openDetailMenu(position: number, name: string): Promise<boolean> {
    const event = new MouseEvent('contextmenu', { ...pointerInit({ x: 0, y: 0 }, {}), button: 2 });

    this.detailControl(position, name)?.dispatchEvent(event);
    await nextTick();
    return event.defaultPrevented;
  }

  async measureRows(sizes: Readonly<Record<number, number>>): Promise<void> {
    const cells = Object.entries(sizes).flatMap(([position, size]) => {
      const cell = this.row(Number(position))?.firstElementChild;

      if (cell === null || cell === undefined) {
        return [];
      }
      defineRect(cell, new DOMRect(0, 0, LAYOUT_WIDTH, size));
      return [cell];
    });

    this.stubs.observers.deliver(cells);
    await nextTick();
  }

  private nested(position: number): HTMLElement {
    const viewport = this.detail(position)?.querySelector<HTMLElement>('.nui-table__viewport');

    if (viewport === null || viewport === undefined) {
      throw new Error(`The detail at ${position} holds no table`);
    }
    return viewport;
  }

  nestedActiveCell(position: number): CellPosition | undefined {
    return activeCellOf(this.nested(position));
  }

  nestedFocusedCell(position: number): CellPosition | undefined {
    return cellPositionOf(this.nested(position), document.activeElement);
  }

  nestedRangedCells(position: number): number {
    return rangedCellsOf(this.nested(position));
  }

  async focusNestedCell(position: number, at: CellPosition): Promise<void> {
    cellAt(this.nested(position), at.row, at.col)?.focus();
    await nextTick();
  }

  async clickNestedCell(
    position: number,
    at: CellPosition,
    options: KeyOptions = {},
  ): Promise<void> {
    await clickCellAt(cellAt(this.nested(position), at.row, at.col), options);
  }

  cellHtml(position: number, col: number): string | undefined {
    return this.cell(position, col)?.querySelector('.nui-table__content')?.innerHTML;
  }

  paneOf(position: number, col: number): string | undefined {
    const cell = this.cell(position, col);

    if (cell === null) {
      return undefined;
    }
    if (cell.classList.contains('nui-table__cell--pin-start')) {
      return 'start';
    }
    return cell.classList.contains('nui-table__cell--pin-end') ? 'end' : 'centre';
  }

  trackWidth(col: number): string | undefined {
    const head = this.header(col);
    const siblings = [...(head?.parentElement?.children ?? [])];

    const track =
      head === null
        ? undefined
        : this.element.querySelectorAll('colgroup > col')[siblings.indexOf(head)];

    return track instanceof HTMLElement ? track.style.inlineSize : undefined;
  }

  grip(col: number): HTMLElement | null {
    return this.header(col)?.querySelector<HTMLElement>('.nui-table__grip') ?? null;
  }

  layoutHeaders(): void {
    const tracks = [...this.element.querySelectorAll<HTMLElement>('colgroup > col')].map(
      (track) => Number.parseFloat(track.style.inlineSize) || 0,
    );

    const frame = this.wrapper.find<HTMLElement>('.nui-table__frame').element;
    let left = 0;

    defineRect(this.element, new DOMRect(0, 0, LAYOUT_WIDTH, LAYOUT_HEIGHT));
    defineRect(frame, new DOMRect(0, 0, LAYOUT_WIDTH, LAYOUT_HEIGHT));

    for (const [index, cell] of [
      ...(this.element.querySelector('.nui-table__row--head')?.children ?? []),
    ].entries()) {
      const width = tracks[index] ?? 0;

      defineRect(cell, new DOMRect(left, 0, width, HEAD_HEIGHT));
      left += width;
    }
  }

  async dragHeader(col: number, target: number, side: 'before' | 'after'): Promise<void> {
    const grip = this.grip(col);
    const source = this.header(col)?.getBoundingClientRect();
    const destination = this.header(target)?.getBoundingClientRect();

    if (grip === null || source === undefined || destination === undefined) {
      throw new Error(`Cannot drag column ${col} to column ${target}`);
    }
    const x = source.left + source.width / 2;

    const to =
      destination.left + destination.width / 2 + (side === 'after' ? GRAB_NUDGE : -GRAB_NUDGE);

    grip.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 2, clientX: x }),
    );

    window.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 2, clientX: x + GRAB_NUDGE }),
    );

    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, clientX: to }));
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, clientX: to }));
    await nextTick();
  }

  resizer(col: number): HTMLElement | null {
    return this.header(col)?.querySelector<HTMLElement>('.nui-table__resizer') ?? null;
  }

  async dragResizer(col: number, dx: number): Promise<void> {
    await dragHandle(this.resizer(col), `column ${col}`, dx);
  }

  async resetResizer(col: number): Promise<void> {
    this.resizer(col)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextTick();
  }

  get windowFrame(): TableWindowFrameText | undefined {
    const grid = this.element.querySelector<HTMLElement>('.nui-table__grid');
    const lead = this.element.style.getPropertyValue('--_window-lead');

    if (grid === null || lead === '') {
      return undefined;
    }
    return {
      lead,
      rest: this.element.style.getPropertyValue('--_window-rest'),
      clampStart: grid.style.getPropertyValue('--_window-clamp-start'),
      clampEnd: grid.style.getPropertyValue('--_window-clamp-end'),
    };
  }

  get rowElements(): HTMLElement[] {
    return bodyRowsOf(this.element);
  }

  get activeCellElement(): HTMLElement | null {
    return this.element.querySelector<HTMLElement>('.nui-table__cell--active');
  }

  async settle(): Promise<void> {
    await nextTick();
  }

  async pressOnPage(key: string): Promise<void> {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await nextTick();
  }

  async idle(): Promise<void> {
    await promiseTimeout(IDLE_WAIT);
  }

  async nextPaint(): Promise<void> {
    await nextFrame();
    await promiseTimeout(0);
    await flushPromises();
  }

  async scroll(position: { readonly top?: number; readonly left?: number }): Promise<void> {
    if (position.top !== undefined) {
      defineValue(this.element, 'scrollTop', position.top);
    }
    if (position.left !== undefined) {
      defineValue(this.element, 'scrollLeft', position.left);
    }
    this.element.dispatchEvent(new Event('scroll'));
    await nextTick();
  }

  async focusCell(position: number, col: number): Promise<void> {
    this.cell(position, col)?.focus();
    await nextTick();
  }

  async press(key: string, options: KeyOptions = {}): Promise<void> {
    await pressKey(document.activeElement ?? this.element, key, options);
  }

  async pressHandled(key: string): Promise<boolean> {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

    (document.activeElement ?? this.element).dispatchEvent(event);
    await nextTick();
    return event.defaultPrevented;
  }

  async clickBand(label: string): Promise<void> {
    const cell = [
      ...this.element.querySelectorAll<HTMLElement>('.nui-table__row--band [role="columnheader"]'),
    ].find((candidate) => candidate.textContent?.trim() === label);

    cell?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
  }

  async clickHeader(col: number, options: KeyOptions = {}): Promise<void> {
    this.header(col)?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, shiftKey: options.shift ?? false }),
    );

    await nextTick();
  }

  async sortBy(col: number, options: KeyOptions = {}): Promise<void> {
    const settled = this.nextSettle();

    this.header(col)?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, shiftKey: options.shift ?? false }),
    );

    await settled;
    await nextTick();
  }

  async pressAndSettle(key: string, options: KeyOptions = {}): Promise<void> {
    const settled = this.nextSettle();

    (document.activeElement ?? this.element).dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        shiftKey: options.shift ?? false,
        bubbles: true,
        cancelable: true,
      }),
    );

    await settled;
    await nextTick();
  }

  async openFilter(col: number): Promise<void> {
    const funnel = this.filterButton(col);

    if (funnel === null) {
      await this.openColumnMenu(col);
      this.menuEntry('Фильтр…')?.click();
    } else {
      funnel.click();
    }
    await flushPromises();
  }

  async dismissFilter(): Promise<void> {
    const popover = this.popover;

    if (popover !== null) {
      dismissPopoverNatively(popover);
    }
    await nextTick();
  }

  async typeInFilter(label: string, value: string): Promise<void> {
    const input = this.filterInput(label);

    if (input !== undefined) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('blur'));
    }
    await nextTick();
  }

  async chooseValue(label: string): Promise<void> {
    const option = [
      ...(this.popover?.querySelectorAll<HTMLElement>('.nui-table-filter__values label') ?? []),
    ].find((entry) => entry.textContent?.trim() === label);

    option?.querySelector<HTMLInputElement>('input')?.click();
    await nextTick();
  }

  async chooseAllValues(): Promise<void> {
    this.allValuesInput?.click();
    await nextTick();
  }

  async searchFilterValues(text: string): Promise<void> {
    const input = this.filterInput('Поиск');

    if (input !== undefined) {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await flushPromises();
  }

  async applyFilter(): Promise<void> {
    const settled = this.nextSettle();

    this.popover
      ?.querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await settled;
    await nextTick();
  }

  async resetFilter(): Promise<void> {
    const settled = this.nextSettle();

    const buttons = this.popover?.querySelectorAll<HTMLButtonElement>(
      '.nui-table-filter__actions button',
    );

    buttons?.[0]?.click();
    await settled;
    await nextTick();
  }

  async toggleRow(position: number): Promise<void> {
    const toggle = this.row(position)?.querySelector<HTMLElement>('.nui-table__toggle--expandable');

    const point = { x: 0, y: 0 };
    const pressed = new MouseEvent('mousedown', pointerInit(point, {}));

    toggle?.dispatchEvent(new PointerEvent('pointerdown', pointerInit(point, {})));
    toggle?.dispatchEvent(pressed);

    if (!pressed.defaultPrevented) {
      toggle?.closest<HTMLElement>('.nui-table__cell')?.focus();
    }
    window.dispatchEvent(new PointerEvent('pointerup', pointerInit(point, {})));
    toggle?.click();
    await nextTick();
  }

  async toggleGroup(position: number): Promise<void> {
    this.row(position)?.querySelector<HTMLElement>('.nui-table__group')?.click();
    await nextTick();
  }

  async setGroupBy(keys: readonly string[]): Promise<void> {
    const settled = this.nextSettle();

    this.models.groupBy.value = keys;
    await settled;
    await nextTick();
  }

  async setQuick(text: string): Promise<void> {
    const settled = this.nextSettle();

    this.models.quick.value = text;
    await settled;
    await nextTick();
  }

  get activeModel(): NuiTableCellPosition | undefined {
    return this.models.active.value;
  }

  get draftModel(): NuiTableDraft | undefined {
    return this.models.draft.value;
  }

  async setActive(next: NuiTableCellPosition): Promise<void> {
    this.models.active.value = next;
    await nextTick();
  }

  async setDraft(next: NuiTableDraft): Promise<void> {
    this.models.draft.value = next;
    await nextTick();
  }

  async startEdit(mode: NuiTableEditMode, options?: NuiTableStartEditOptions): Promise<boolean> {
    const opened = this.exposed.value?.startEdit(mode, options) ?? false;

    await nextTick();
    return opened;
  }

  async commitEdit(move?: NuiTableEditMove): Promise<boolean> {
    const committed = this.exposed.value?.commitEdit(move) ?? false;

    await nextTick();
    return committed;
  }

  async cancelEdit(): Promise<void> {
    this.exposed.value?.cancelEdit();
    await nextTick();
  }

  async moveActive(position: NuiTableCellPosition): Promise<boolean> {
    const moved = this.exposed.value?.moveActive(position) ?? false;

    await nextTick();
    return moved;
  }

  get editorCaret(): readonly [number | null, number | null] | undefined {
    const field = this.editorField;

    return field === null ? undefined : [field.selectionStart, field.selectionEnd];
  }

  placeEditorCaret(start: number, end: number): void {
    this.editorField?.setSelectionRange(start, end);
  }

  async focusCellByRef(position: NuiTableCellPosition): Promise<boolean> {
    const focused = this.exposed.value?.focusCell(position) ?? false;

    await nextTick();
    return focused;
  }

  async invalidate(ranges?: NuiTableRanges): Promise<void> {
    this.exposed.value?.invalidate(ranges);
    await nextTick();
  }

  async focusOutside(target: HTMLElement): Promise<void> {
    target.focus();
    await nextTick();
  }

  async setRowHeights(next: NuiTableRowHeights): Promise<void> {
    this.models.rowHeights.value = next;
    await nextTick();
  }

  async setSort(next: readonly TableSort[]): Promise<void> {
    const settled = this.nextSettle();

    this.models.sort.value = next;
    await settled;
    await nextTick();
  }

  async setSlots(slots: TableSlotViews): Promise<void> {
    await this.wrapper.setProps({ slots: markRaw({ ...slots }) });
  }

  async setSource(rows: readonly T[]): Promise<void> {
    this.source.value = rows;
    await nextTick();
  }

  async exportCsv(options?: NuiTableCsvOptions): Promise<string> {
    const text = await this.exposed.value?.exportCsv(options);

    await nextTick();
    return text ?? '';
  }

  async scrollToRow(position: number): Promise<void> {
    this.exposed.value?.scrollToRow(position);
    await nextTick();
  }

  async scrollToColumn(key: string): Promise<void> {
    this.exposed.value?.scrollToColumn(key);
    await nextTick();
  }

  unmount(): void {
    this.wrapper.unmount();
    this.stubs.layers.restore();
    this.stubs.observers.restore();
  }
}
