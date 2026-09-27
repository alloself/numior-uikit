import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { NuiTable, type NuiConfigOptions, type NuiTableProps, type NuiTableSort } from '../../src';
import { configPlugins } from '../support/config';
import { COLUMNS, isPerson, PEOPLE, type Person } from '../support/rows';
import { choosePageSize } from '../support/page-size';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';
import {
  isNumber,
  isString,
  listOf,
  nullable,
  oneOf,
  optional,
  recordOf,
  shapeOf,
} from '../../../primitives/test/support/guards';

const isReorderEvent = shapeOf({
  row: isPerson,
  from: isNumber,
  to: isNumber,
  parent: optional(isPerson),
});

const isStringList = listOf(isString);

const isWidths = recordOf(isNumber);

const isSort = nullable(shapeOf({ key: isString, direction: oneOf('asc', 'desc') }));

const isPeople = listOf(isPerson);

export interface TableMountOptions {
  readonly props?: Partial<Omit<NuiTableProps<unknown>, 'columns' | 'rows'>>;
  readonly columns?: NuiTableProps<unknown>['columns'];
  readonly rows?: readonly Person[];
  readonly sort?: NuiTableSort;
  readonly selected?: readonly Person[];
  readonly page?: number;
  readonly pageSize?: number;
  readonly columnOrder?: readonly string[];
  readonly widths?: Record<string, number>;
  readonly expanded?: readonly Person[];
  readonly headerWidth?: number;
  readonly slots?: Record<string, (context: Record<string, unknown>) => unknown>;
  readonly config?: NuiConfigOptions;
}

interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const rectOf = (box: Box): DOMRect => ({
  x: box.left,
  y: box.top,
  width: box.width,
  height: box.height,
  top: box.top,
  left: box.left,
  right: box.left + box.width,
  bottom: box.top + box.height,
  toJSON: () => ({}),
});

const defineRect = (element: HTMLElement, box: Box): void => {
  const rect = rectOf(box);

  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => rect,
    configurable: true,
  });
};

const pointerAt = (type: string, clientX: number, clientY: number): PointerEvent =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 7,
    button: 0,
    clientX,
    clientY,
  });

const pointer = (type: string, clientX: number): PointerEvent => pointerAt(type, clientX, 0);

const defineSize = (element: HTMLElement, name: string, value: number): void => {
  Object.defineProperty(element, name, { value, configurable: true, writable: true });
};

export class TableDriver extends ComponentDriver {
  protected readonly block = 'nui-table';

  static mount({
    props = {},
    columns = COLUMNS,
    rows = PEOPLE,
    sort = null,
    selected = [],
    page = 1,
    pageSize = 20,
    columnOrder = [],
    widths = {},
    expanded = [],
    headerWidth,
    slots = {},
    config,
  }: TableMountOptions = {}) {
    const stubs = new TopLayerStubs();
    if (headerWidth !== undefined) {
      const rect = rectOf({ left: 0, top: 0, width: headerWidth, height: 40 });

      stubs.define(HTMLTableCellElement.prototype, 'getBoundingClientRect', {
        value: () => rect,
      });
    }
    const sortRef = ref<NuiTableSort>(sort);
    const selectedRef = ref<Person[]>([...selected]);
    const pageRef = ref(page);
    const pageSizeRef = ref(pageSize);
    const orderRef = ref<string[]>([...columnOrder]);
    const widthsRef = ref<Record<string, number>>({ ...widths });
    const expandedRef = ref<Person[]>([...expanded]);
    const propsRef = ref(props);
    const rowsRef = ref<readonly Person[]>(rows);
    const clicks: string[] = [];
    const reorders: string[] = [];
    const loads: string[] = [];

    const Host = defineComponent({
      setup: () => () =>
        h(
          NuiTable,
          {
            columns,
            rows: rowsRef.value,
            getKey: (row: unknown) => (isPerson(row) ? String(row.id) : String(row)),
            ...propsRef.value,
            sort: sortRef.value,
            selected: selectedRef.value,
            page: pageRef.value,
            pageSize: pageSizeRef.value,
            columnOrder: orderRef.value,
            widths: widthsRef.value,
            expanded: expandedRef.value,
            'onUpdate:expanded': (value: unknown) => {
              if (isPeople(value)) {
                expandedRef.value = value;
              }
            },
            onReorder: (event: unknown) => {
              if (isReorderEvent(event)) {
                reorders.push(
                  `${event.row.name}:${event.from}->${event.to}@${event.parent?.name ?? 'root'}`,
                );
              }
            },
            onLoad: (row: unknown) => {
              if (isPerson(row)) {
                loads.push(row.name);
              }
            },
            'onUpdate:columnOrder': (value: unknown) => {
              if (isStringList(value)) {
                orderRef.value = value;
              }
            },
            'onUpdate:widths': (value: unknown) => {
              if (isWidths(value)) {
                widthsRef.value = value;
              }
            },
            'onUpdate:sort': (value: unknown) => {
              if (isSort(value)) {
                sortRef.value = value;
              }
            },
            'onUpdate:selected': (value: unknown) => {
              if (isPeople(value)) {
                selectedRef.value = value;
              }
            },
            'onUpdate:page': (value: unknown) => {
              if (typeof value === 'number') {
                pageRef.value = value;
              }
            },
            'onUpdate:pageSize': (value: unknown) => {
              if (typeof value === 'number') {
                pageSizeRef.value = value;
              }
            },
            onRowClick: (row: unknown) => {
              if (isPerson(row)) {
                clicks.push(row.name);
              }
            },
          },
          slots,
        ),
    });

    return new TableDriver(
      mount(Host, { attachTo: document.body, global: { plugins: configPlugins(config) } }),
      stubs,
      {
        sort: sortRef,
        selected: selectedRef,
        page: pageRef,
        pageSize: pageSizeRef,
        order: orderRef,
        widths: widthsRef,
        expanded: expandedRef,
      },
      propsRef,
      rowsRef,
      clicks,
      reorders,
      loads,
    );
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly models: {
      readonly sort: Ref<NuiTableSort>;
      readonly selected: Ref<Person[]>;
      readonly page: Ref<number>;
      readonly pageSize: Ref<number>;
      readonly order: Ref<string[]>;
      readonly widths: Ref<Record<string, number>>;
      readonly expanded: Ref<Person[]>;
    },
    private readonly propsRef: Ref<TableMountOptions['props']>,
    private readonly rowsRef: Ref<readonly Person[]>,
    readonly clicks: string[],
    readonly reorders: string[],
    readonly loads: string[],
  ) {
    super(wrapper);
  }

  override hasModifier(modifier: string): boolean {
    return this.wrapper.find('.nui-table').classes().includes(`nui-table--${modifier}`);
  }

  get table(): DOMWrapper<HTMLTableElement> {
    return this.wrapper.find<HTMLTableElement>('table');
  }

  get scroller(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-table__scroller');
  }

  get headers(): string[] {
    return this.wrapper.findAll('thead th').map((cell) => cell.text());
  }

  private header(label: string): DOMWrapper<HTMLElement> {
    const found = this.wrapper
      .findAll<HTMLElement>('thead th')
      .find((cell) => cell.text() === label);

    if (!found) {
      throw new Error(`No column labelled ${label}`);
    }
    return found;
  }

  ariaSort(label: string): string | undefined {
    return this.header(label).attributes('aria-sort');
  }

  private get bodyRows(): DOMWrapper<HTMLElement>[] {
    return this.wrapper.findAll<HTMLElement>(
      'tbody:not(.nui-table__body--pinned) .nui-table__row:not(.nui-table__row--status):not(.nui-table__row--loading)',
    );
  }

  get pinnedNames(): string[] {
    const index = this.columnIndex('Имя');
    return this.wrapper
      .findAll('.nui-table__body--pinned .nui-table__row')
      .map((row) => row.findAll('td')[index]?.text() ?? '');
  }

  get expandedNames(): string[] {
    return this.models.expanded.value.map((person) => person.name);
  }

  levelOf(name: string): string | undefined {
    const style = this.row(name).find('.nui-table__cell--tree').attributes('style') ?? '';
    return /--_level: (\d+)/.exec(style)?.[1];
  }

  toggleOf(name: string): DOMWrapper<Element> {
    return this.row(name).find('button.nui-table__toggle');
  }

  toggleBusy(name: string): boolean {
    return this.toggleOf(name).attributes('aria-busy') === 'true';
  }

  rowGrip(name: string): DOMWrapper<Element> {
    return this.row(name).find('.nui-table__cell--drag .nui-table__grip');
  }

  layoutRows(height: number): void {
    const body = this.wrapper.find<HTMLElement>('tbody:not(.nui-table__body--pinned)');

    defineRect(body.element, {
      left: 0,
      top: 0,
      width: 400,
      height: height * this.bodyRows.length,
    });

    this.bodyRows.forEach((row, index) => {
      defineRect(row.element, { left: 0, top: index * height, width: 400, height });
    });

    defineRect(this.scroller.element, { left: 0, top: 0, width: 400, height: 400 });
  }

  async clickToggle(name: string): Promise<void> {
    await this.toggleOf(name).trigger('click');
    await nextTick();
  }

  async pressRowGrip(name: string, key: string): Promise<void> {
    await this.rowGrip(name).trigger('keydown', { key });
    await nextTick();
  }

  async grabRow(name: string, from: number, to: number): Promise<void> {
    this.rowGrip(name).element.dispatchEvent(pointerAt('pointerdown', 0, from));
    await nextTick();
    window.dispatchEvent(pointerAt('pointermove', 0, from + Math.sign(to - from) * 3));
    window.dispatchEvent(pointerAt('pointermove', 0, to));
    await nextTick();
  }

  private columnIndex(label: string): number {
    return this.wrapper.findAll('thead th').findIndex((cell) => cell.text() === label);
  }

  columnTexts(label: string): string[] {
    const index = this.columnIndex(label);
    return this.bodyRows.map((row) => row.findAll('td')[index]?.text() ?? '');
  }

  private row(name: string): DOMWrapper<HTMLElement> {
    const index = this.columnIndex('Имя');
    const found = this.bodyRows.find((row) => row.findAll('td')[index]?.text() === name);
    if (!found) {
      throw new Error(`No row named ${name}`);
    }
    return found;
  }

  get sort(): NuiTableSort {
    return this.models.sort.value;
  }

  get selectedNames(): string[] {
    return this.models.selected.value.map((person) => person.name);
  }

  get page(): number {
    return this.models.page.value;
  }

  get pageSize(): number {
    return this.models.pageSize.value;
  }

  get columnOrder(): string[] {
    return this.models.order.value;
  }

  get widths(): Record<string, number> {
    return this.models.widths.value;
  }

  get selectAllLabel(): string | undefined {
    return this.wrapper.find("thead input[type='checkbox']").attributes('aria-label');
  }

  selectLabelOf(name: string): string | undefined {
    return this.row(name).find("input[type='checkbox']").attributes('aria-label');
  }

  reorderLabelOf(label: string): string | undefined {
    return this.header(label).find('.nui-table__grip').attributes('aria-label');
  }

  resizeLabelOf(label: string): string | undefined {
    return this.resizer(label).attributes('aria-label');
  }

  expandLabelOf(name: string): string | undefined {
    return this.toggleOf(name).attributes('aria-label');
  }

  dragLabelOf(name: string): string | undefined {
    return this.rowGrip(name).attributes('aria-label');
  }

  get liveText(): string {
    return this.wrapper.find('.nui-table__live').text();
  }

  get fixedLayout(): boolean {
    return this.wrapper.find<HTMLTableElement>('table').element.style.tableLayout === 'fixed';
  }

  tableVar(name: string): string {
    return this.wrapper.find<HTMLTableElement>('table').element.style.getPropertyValue(name);
  }

  colStyle(label: string): string {
    const col = this.wrapper.findAll('colgroup col')[this.columnIndex(label)];
    return col?.attributes('style') ?? '';
  }

  headerClasses(label: string): string[] {
    return this.header(label).classes();
  }

  cellClasses(name: string, label: string): string[] {
    return this.row(name).findAll('td')[this.columnIndex(label)]?.classes() ?? [];
  }

  cellStyle(name: string, label: string): string {
    return this.row(name).findAll('td')[this.columnIndex(label)]?.attributes('style') ?? '';
  }

  selectCellClasses(name: string): string[] {
    return this.row(name).find('.nui-table__cell--select').classes();
  }

  selectCellStyle(name: string): string {
    return this.row(name).find('.nui-table__cell--select').attributes('style') ?? '';
  }

  get ghostText(): string | undefined {
    const ghost = this.wrapper.find('.nui-table__ghost');
    return ghost.exists() ? ghost.text().trim() : undefined;
  }

  resizer(label: string): DOMWrapper<Element> {
    return this.header(label).find('.nui-table__resizer');
  }

  layoutHeaders(width: number): void {
    const cells = this.wrapper.findAll<HTMLElement>('thead th');

    cells.forEach((cell, index) => {
      defineRect(cell.element, { left: index * width, top: 0, width, height: 40 });
    });

    defineRect(this.scroller.element, {
      left: 0,
      top: 0,
      width: width * cells.length,
      height: 400,
    });
  }

  async pressResizer(label: string, key: string, shiftKey = false): Promise<void> {
    await this.resizer(label).trigger('keydown', { key, shiftKey });
    await nextTick();
  }

  async dragResizer(label: string, from: number, to: number): Promise<void> {
    this.resizer(label).element.dispatchEvent(pointer('pointerdown', from));
    await nextTick();
    window.dispatchEvent(pointer('pointermove', to));
    await nextTick();
    window.dispatchEvent(pointer('pointerup', to));
    await nextTick();
  }

  async pressGrip(label: string, key: string): Promise<void> {
    await this.header(label).find('.nui-table__grip').trigger('keydown', { key });
    await nextTick();
  }

  async grabHeader(label: string, from: number, to: number): Promise<void> {
    const cell = this.header(label).element;
    cell.dispatchEvent(pointer('pointerdown', from));
    await nextTick();
    window.dispatchEvent(pointer('pointermove', from + Math.sign(to - from) * 3));
    window.dispatchEvent(pointer('pointermove', to));
    await nextTick();
  }

  async dropAt(x: number, y: number): Promise<void> {
    window.dispatchEvent(pointerAt('pointerup', x, y));
    await nextTick();
  }

  async dragHeader(label: string, from: number, to: number): Promise<void> {
    await this.grabHeader(label, from, to);
    await this.dropAt(to, 0);
  }

  get headerCheckbox(): { readonly checked: boolean; readonly indeterminate: boolean } {
    const input = this.wrapper.find<HTMLInputElement>('thead input[type="checkbox"]').element;
    return { checked: input.checked, indeterminate: input.indeterminate };
  }

  rowChecked(name: string): boolean {
    return this.row(name).find<HTMLInputElement>('input[type="checkbox"]').element.checked;
  }

  rowSelected(name: string): string | undefined {
    return this.row(name).attributes('aria-selected');
  }

  get busy(): boolean {
    return this.table.attributes('aria-busy') === 'true';
  }

  get skeletonRows(): number {
    return this.wrapper.findAll('.nui-table__row--loading').length;
  }

  get statusText(): string {
    const status = this.wrapper.find('.nui-table__cell--status');
    return status.exists() ? status.text() : '';
  }

  get renderedRowCount(): number {
    return this.bodyRows.length;
  }

  get spacers(): string[] {
    return this.wrapper
      .findAll<HTMLElement>('.nui-table__spacer td')
      .map((cell) => cell.element.style.blockSize);
  }

  get ariaRowCount(): string | undefined {
    return this.table.attributes('aria-rowcount');
  }

  get rangeText(): string {
    const range = this.wrapper.find('.nui-pagination__range');
    return range.exists() ? range.text() : '';
  }

  get captionText(): string {
    const caption = this.wrapper.find('caption');
    return caption.exists() ? caption.text() : '';
  }

  cellText(name: string, label: string): string {
    return this.row(name).findAll('td')[this.columnIndex(label)]?.text() ?? '';
  }

  cellHtml(name: string, label: string): string {
    return this.row(name).findAll('td')[this.columnIndex(label)]?.html() ?? '';
  }

  async clickHeader(label: string): Promise<void> {
    await this.header(label).find('.nui-table__sort').trigger('click');
    await nextTick();
  }

  private async flip(input: DOMWrapper<HTMLInputElement>): Promise<void> {
    input.element.checked = !input.element.checked;
    await input.trigger('change');
    await nextTick();
  }

  async toggleAll(): Promise<void> {
    await this.flip(this.wrapper.find<HTMLInputElement>('thead input[type="checkbox"]'));
  }

  async toggleRow(name: string): Promise<void> {
    await this.flip(this.row(name).find<HTMLInputElement>('input[type="checkbox"]'));
  }

  async clickRow(name: string): Promise<void> {
    const cells = this.row(name).findAll('td');
    await (cells[cells.length - 1] ?? this.row(name)).trigger('click');
  }

  async nextPage(): Promise<void> {
    await this.wrapper.find('.nui-pagination__next').trigger('click');
    await nextTick();
  }

  async choosePageSize(size: number): Promise<void> {
    await choosePageSize(this.wrapper, size);
  }

  async receive(props: TableMountOptions['props']): Promise<void> {
    this.propsRef.value = { ...this.propsRef.value, ...props };
    await nextTick();
  }

  async receiveRows(rows: readonly Person[]): Promise<void> {
    this.rowsRef.value = rows;
    await nextTick();
  }

  async setHeight(height: number): Promise<void> {
    defineSize(this.scroller.element, 'clientHeight', height);
    this.scroller.element.dispatchEvent(new Event('scroll'));
    await nextTick();
  }

  async scrollTo(top: number): Promise<void> {
    defineSize(this.scroller.element, 'scrollTop', top);
    this.scroller.element.dispatchEvent(new Event('scroll'));
    await nextTick();
  }

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
  }
}
