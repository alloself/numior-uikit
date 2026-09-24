import type { Locator, Page } from '@playwright/test';

export interface TableOutput {
  readonly sort: { readonly key: string; readonly direction: string } | null;
  readonly selected: readonly string[];
  readonly page: number;
  readonly pageSize: number;
  readonly lastRowClick: string | null;
  readonly loading: boolean;
  readonly empty: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSort = (value: unknown): value is TableOutput['sort'] =>
  value === null ||
  (isRecord(value) && typeof value.key === 'string' && typeof value.direction === 'string');

const isTableOutput = (
  data: Record<string, unknown>,
): data is Record<string, unknown> & TableOutput =>
  isSort(data.sort) &&
  Array.isArray(data.selected) &&
  data.selected.every((entry) => typeof entry === 'string') &&
  typeof data.page === 'number' &&
  typeof data.pageSize === 'number' &&
  (data.lastRowClick === null || typeof data.lastRowClick === 'string') &&
  typeof data.loading === 'boolean' &&
  typeof data.empty === 'boolean';

const parseTableOutput = (text: string): TableOutput => {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data) || !isTableOutput(data)) {
    throw new Error(`Unexpected table output: ${text}`);
  }
  return data;
};

const ROW_SELECTOR =
  'tbody .nui-table__row:not(.nui-table__row--status):not(.nui-table__row--loading)';

export class TableSection {
  readonly table: Locator;
  readonly virtualTable: Locator;
  readonly loadingToggle: Locator;
  readonly emptyToggle: Locator;
  readonly output: Locator;

  constructor(page: Page) {
    this.table = page.getByTestId('data-table');
    this.virtualTable = page.getByTestId('data-table-virtual');
    this.loadingToggle = page.getByTestId('data-table-loading');
    this.emptyToggle = page.getByTestId('data-table-empty');
    this.output = page.getByTestId('table-output');
  }

  header(label: string): Locator {
    return this.table.getByRole('columnheader', { name: label });
  }

  sortButton(label: string): Locator {
    return this.header(label).getByRole('button');
  }

  rows(table: Locator): Locator {
    return table.locator(ROW_SELECTOR);
  }

  row(name: string): Locator {
    return this.rows(this.table).filter({
      has: this.table.page().getByText(name, { exact: true }),
    });
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

  overflowsHorizontally(table: Locator): Promise<boolean> {
    return this.scroller(table).evaluate((element) => element.scrollWidth > element.clientWidth);
  }

  indeterminate(checkbox: Locator): Promise<boolean> {
    return checkbox.evaluate(
      (element) => element instanceof HTMLInputElement && element.indeterminate,
    );
  }

  async readOutput(): Promise<TableOutput> {
    return parseTableOutput(await this.output.innerText());
  }
}
