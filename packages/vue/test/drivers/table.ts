import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { NuiTable, type NuiTableProps, type NuiTableSort } from '../../src';
import { COLUMNS, isPerson, PEOPLE, type Person } from '../support/rows';
import { choosePageSize } from '../support/page-size';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface TableMountOptions {
  readonly props?: Partial<Omit<NuiTableProps<unknown>, 'columns' | 'rows'>>;
  readonly columns?: NuiTableProps<unknown>['columns'];
  readonly rows?: readonly Person[];
  readonly sort?: NuiTableSort;
  readonly selected?: readonly Person[];
  readonly page?: number;
  readonly pageSize?: number;
  readonly slots?: Record<string, (context: Record<string, unknown>) => unknown>;
}

const isSort = (value: unknown): value is NuiTableSort =>
  value === null ||
  (typeof value === 'object' && value !== null && 'key' in value && 'direction' in value);

const isPeople = (value: unknown): value is Person[] =>
  Array.isArray(value) && value.every(isPerson);

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
    slots = {},
  }: TableMountOptions = {}) {
    const stubs = new TopLayerStubs();
    const sortRef = ref<NuiTableSort>(sort);
    const selectedRef = ref<Person[]>([...selected]);
    const pageRef = ref(page);
    const pageSizeRef = ref(pageSize);
    const propsRef = ref(props);
    const rowsRef = ref<readonly Person[]>(rows);
    const clicks: string[] = [];
    const Host = defineComponent({
      setup: () => () =>
        h(
          NuiTable,
          {
            columns,
            rows: rowsRef.value,
            ...propsRef.value,
            sort: sortRef.value,
            selected: selectedRef.value,
            page: pageRef.value,
            pageSize: pageSizeRef.value,
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
      mount(Host, { attachTo: document.body }),
      stubs,
      { sort: sortRef, selected: selectedRef, page: pageRef, pageSize: pageSizeRef },
      propsRef,
      rowsRef,
      clicks,
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
    },
    private readonly propsRef: Ref<TableMountOptions['props']>,
    private readonly rowsRef: Ref<readonly Person[]>,
    readonly clicks: string[],
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
      'tbody .nui-table__row:not(.nui-table__row--status):not(.nui-table__row--loading)',
    );
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
    await nextTick();
  }

  async scrollTo(top: number): Promise<void> {
    defineSize(this.scroller.element, 'scrollTop', top);
    this.scroller.element.dispatchEvent(new Event('scroll'));
    await nextTick();
    await nextTick();
  }

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
  }
}
