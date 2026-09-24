import type { Locator, Page } from '@playwright/test';

export interface TableOutput {
  readonly sort: { readonly key: string; readonly direction: string } | null;
  readonly selected: readonly string[];
  readonly page: number;
  readonly pageSize: number;
  readonly lastRowClick: string | null;
  readonly loading: boolean;
  readonly empty: boolean;
  readonly columnOrder: readonly string[];
  readonly widths: Readonly<Record<string, number>>;
  readonly expanded: readonly string[];
  readonly loaded: readonly string[];
  readonly lastReorder: string | null;
  readonly teamOrder: readonly string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSort = (value: unknown): value is TableOutput['sort'] =>
  value === null ||
  (isRecord(value) && typeof value.key === 'string' && typeof value.direction === 'string');

const isStringList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const isWidths = (value: unknown): value is Readonly<Record<string, number>> =>
  isRecord(value) && Object.values(value).every((entry) => typeof entry === 'number');

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isNumber = (value: unknown): value is number => typeof value === 'number';

const OUTPUT_GUARDS: Readonly<Record<keyof TableOutput, (value: unknown) => boolean>> = {
  sort: isSort,
  selected: isStringList,
  page: isNumber,
  pageSize: isNumber,
  lastRowClick: isNullableString,
  loading: isBoolean,
  empty: isBoolean,
  columnOrder: isStringList,
  widths: isWidths,
  expanded: isStringList,
  loaded: isStringList,
  lastReorder: isNullableString,
  teamOrder: isStringList,
};

const isTableOutput = (
  data: Record<string, unknown>,
): data is Record<string, unknown> & TableOutput =>
  Object.entries(OUTPUT_GUARDS).every(([key, guard]) => guard(data[key]));

const parseTableOutput = (text: string): TableOutput => {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data) || !isTableOutput(data)) {
    throw new Error(`Unexpected table output: ${text}`);
  }
  return data;
};

const ROW_SELECTOR =
  'tbody:not(.nui-table__body--pinned) .nui-table__row:not(.nui-table__row--status):not(.nui-table__row--loading)';

export class TableSection {
  readonly table: Locator;
  readonly treeTable: Locator;
  readonly virtualTable: Locator;
  readonly loadingToggle: Locator;
  readonly emptyToggle: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.table = page.getByTestId('data-table');
    this.treeTable = page.getByTestId('data-table-tree');
    this.virtualTable = page.getByTestId('data-table-virtual');
    this.loadingToggle = page.getByTestId('data-table-loading');
    this.emptyToggle = page.getByTestId('data-table-empty');
    this.output = page.getByTestId('table-output');
  }

  header(label: string, table: Locator = this.table): Locator {
    return table.getByRole('columnheader', { name: label });
  }

  sortButton(label: string): Locator {
    return this.header(label).getByRole('button', { name: label, exact: true });
  }

  resizer(label: string): Locator {
    return this.header(label).getByRole('separator');
  }

  columnGrip(label: string): Locator {
    return this.header(label).getByRole('button', { name: `Переставить колонку ${label}` });
  }

  headerLabels(table: Locator = this.table): Promise<string[]> {
    return table.locator('thead th').allInnerTexts();
  }

  rows(table: Locator): Locator {
    return table.locator(ROW_SELECTOR);
  }

  row(name: string): Locator {
    return this.rows(this.table).filter({ has: this.page.getByText(name, { exact: true }) });
  }

  treeRow(name: string): Locator {
    return this.rows(this.treeTable).filter({ has: this.page.getByText(name, { exact: true }) });
  }

  toggleOf(name: string): Locator {
    return this.treeRow(name).getByRole('button', { name: `Раскрыть ${name}` });
  }

  gripOf(name: string): Locator {
    return this.treeRow(name).getByRole('button', { name: `Переставить ${name}` });
  }

  async cellsOf(table: Locator, label: string): Promise<Locator> {
    const headers = await table.locator('thead th').allInnerTexts();
    const index = headers.findIndex((text) => text.trim().startsWith(label));
    return this.rows(table).locator(`td:nth-child(${index + 1})`);
  }

  get selectAll(): Locator {
    return this.table.locator('thead').getByRole('checkbox');
  }

  get nextPage(): Locator {
    return this.table.getByRole('button', { name: 'Следующая' });
  }

  get pageSizeTrigger(): Locator {
    return this.table.getByRole('combobox');
  }

  get rangeText(): Locator {
    return this.table.locator('.nui-pagination__range');
  }

  get emptyState(): Locator {
    return this.table.locator('.nui-empty');
  }

  get skeletons(): Locator {
    return this.table.locator('.nui-table__row--loading');
  }

  scroller(table: Locator): Locator {
    return table.locator('.nui-table__scroller');
  }

  async scrollToBottom(table: Locator): Promise<void> {
    await this.scroller(table).evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
  }

  async scrollHorizontally(table: Locator, left: number): Promise<void> {
    await this.scroller(table).evaluate((element, value) => {
      element.scrollLeft = value;
    }, left);
  }

  scrollSlack(table: Locator): Promise<number> {
    return this.scroller(table).evaluate(
      (element) =>
        element.scrollWidth - (element.firstElementChild?.getBoundingClientRect().width ?? 0),
    );
  }

  overflowsHorizontally(table: Locator): Promise<boolean> {
    return this.scroller(table).evaluate((element) => element.scrollWidth > element.clientWidth);
  }

  indeterminate(checkbox: Locator): Promise<boolean> {
    return checkbox.evaluate(
      (element) => element instanceof HTMLInputElement && element.indeterminate,
    );
  }

  async dragBetween(
    source: Locator,
    target: Locator,
    dx = 0,
    dy = 0,
    whileDragging?: () => Promise<void>,
  ): Promise<void> {
    await source.scrollIntoViewIfNeeded();
    const from = await source.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) {
      throw new Error('Drag endpoints are not rendered');
    }
    const startX = from.x + from.width / 2;
    const startY = from.y + from.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + 4, startY + 4);
    await this.page.mouse.move(to.x + to.width / 2 + dx, to.y + to.height / 2 + dy, { steps: 8 });
    await whileDragging?.();
    await this.page.mouse.up();
  }

  get ghost(): Locator {
    return this.page.locator('.nui-table__ghost');
  }

  dropLine(table: Locator): Locator {
    return table.locator('.nui-table__drop--column');
  }

  opacityOf(locator: Locator): Promise<string> {
    return locator.evaluate((element) => getComputedStyle(element).opacity);
  }

  async dragBy(source: Locator, dx: number): Promise<void> {
    await source.scrollIntoViewIfNeeded();
    const from = await source.boundingBox();
    if (!from) {
      throw new Error('Drag source is not rendered');
    }
    const startX = from.x + from.width / 2;
    const startY = from.y + from.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + dx, startY, { steps: 6 });
    await this.page.mouse.up();
  }

  async readOutput(): Promise<TableOutput> {
    return parseTableOutput(await this.output.innerText());
  }
}
