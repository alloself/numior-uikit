import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { createNuiConfig, type NuiConfigOptions } from '@numior/primitives';
import {
  defineComponent,
  h,
  nextTick,
  shallowRef,
  type Plugin,
  type ShallowRef,
  type Slots,
} from 'vue';
import {
  NuiDataGrid,
  type NuiDataGridExposed,
  type NuiDataGridProps,
  type NuiGridColumn,
} from '../../src';

export interface DataGridMountOptions<T> {
  readonly columns: readonly NuiGridColumn<T>[];
  readonly source: readonly T[];
  readonly props?: Omit<NuiDataGridProps<T>, 'columns' | 'source'>;
  readonly slots?: Slots;
  readonly width?: number;
  readonly height?: number;
  readonly dir?: 'ltr' | 'rtl';
  readonly config?: NuiConfigOptions;
}

export interface CellPosition {
  readonly row: number;
  readonly col: number;
}

export interface KeyOptions {
  readonly ctrl?: boolean;
  readonly shift?: boolean;
}

const defineValue = (element: HTMLElement, name: string, value: number): void => {
  Object.defineProperty(element, name, { value, configurable: true, writable: true });
};

const isExposed = (value: unknown): value is NuiDataGridExposed =>
  typeof value === 'object' &&
  value !== null &&
  'scrollToRow' in value &&
  typeof value.scrollToRow === 'function' &&
  'scrollToColumn' in value &&
  typeof value.scrollToColumn === 'function';

const numberAttribute = (element: Element | null | undefined, name: string): number =>
  Number(element?.getAttribute(name) ?? Number.NaN);

const positionOf = (cell: Element | null): CellPosition | undefined => {
  if (cell === null || !cell.matches('.nui-grid__cell')) {
    return undefined;
  }
  return {
    row: numberAttribute(cell.closest('[role="row"]'), 'aria-rowindex') - 2,
    col: numberAttribute(cell, 'aria-colindex') - 1,
  };
};

export class DataGridDriver<T> {
  static mount<T>(options: DataGridMountOptions<T>): DataGridDriver<T> {
    const source = shallowRef(options.source);
    const exposed = shallowRef<NuiDataGridExposed | null>(null);

    const setExposed = (value: unknown): void => {
      exposed.value = isExposed(value) ? value : null;
    };

    const Host = defineComponent({
      setup: () => () =>
        h('div', { dir: options.dir ?? 'ltr' }, [
          h(
            NuiDataGrid<T>,
            {
              ...options.props,
              columns: options.columns,
              source: source.value,
              ref: setExposed,
            },
            options.slots,
          ),
        ]),
    });

    const plugins: Plugin[] = options.config === undefined ? [] : [createNuiConfig(options.config)];
    const wrapper = mount(Host, { attachTo: document.body, global: { plugins } });
    const driver = new DataGridDriver<T>(wrapper, source, exposed);

    driver.size(options.width ?? 500, options.height ?? 300);
    return driver;
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly source: ShallowRef<readonly T[]>,
    private readonly exposed: ShallowRef<NuiDataGridExposed | null>,
  ) {}

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
    return this.wrapper.find<HTMLElement>('.nui-grid__viewport');
  }

  get rowCount(): number {
    return numberAttribute(this.element, 'aria-rowcount');
  }

  get colCount(): number {
    return numberAttribute(this.element, 'aria-colcount');
  }

  get label(): string | undefined {
    return this.viewport.attributes('aria-label');
  }

  get scrollTop(): number {
    return this.element.scrollTop;
  }

  get scrollLeft(): number {
    return this.element.scrollLeft;
  }

  get renderedRows(): number[] {
    return this.wrapper
      .findAll('.nui-grid__body > [role="row"]')
      .map((row) => numberAttribute(row.element, 'aria-rowindex') - 2);
  }

  get headerTexts(): string[] {
    return this.wrapper.findAll('[role="columnheader"]').map((cell) => cell.text());
  }

  get activeCell(): CellPosition | undefined {
    return positionOf(this.element.querySelector('.nui-grid__cell[tabindex="0"]'));
  }

  get focusedCell(): CellPosition | undefined {
    return positionOf(document.activeElement);
  }

  get emptyText(): string | undefined {
    const empty = this.wrapper.find('.nui-grid__empty');
    return empty.exists() ? empty.text() : undefined;
  }

  private row(position: number): Element | null {
    return this.element.querySelector(`[role="row"][aria-rowindex="${position + 2}"]`);
  }

  cell(position: number, col: number): HTMLElement | null {
    return this.row(position)?.querySelector<HTMLElement>(`[aria-colindex="${col + 1}"]`) ?? null;
  }

  cellText(position: number, col: number): string | undefined {
    return this.cell(position, col)?.textContent?.trim();
  }

  cellHtml(position: number, col: number): string | undefined {
    return this.cell(position, col)?.innerHTML;
  }

  paneOf(position: number, col: number): string | undefined {
    const pane = this.cell(position, col)?.closest('.nui-grid__pane');
    return ['start', 'centre', 'end'].find((name) =>
      pane?.classList.contains(`nui-grid__pane--${name}`),
    );
  }

  rowTransform(position: number): string | undefined {
    const row = this.row(position);
    return row instanceof HTMLElement ? row.style.transform : undefined;
  }

  async settle(): Promise<void> {
    await nextTick();
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
    const target = document.activeElement ?? this.element;

    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        ctrlKey: options.ctrl ?? false,
        shiftKey: options.shift ?? false,
        bubbles: true,
        cancelable: true,
      }),
    );

    await nextTick();
  }

  async setSource(rows: readonly T[]): Promise<void> {
    this.source.value = rows;
    await nextTick();
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
  }
}
