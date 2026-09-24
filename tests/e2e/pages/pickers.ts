import type { Locator, Page } from '@playwright/test';

export interface PickersOutput {
  readonly country: string | null;
  readonly tags: readonly string[];
  readonly city: string | null;
  readonly cityLoading: boolean;
  readonly keywords: readonly string[];
  readonly page: number;
  readonly pageSize: number;
  readonly linkPage: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const isPickersOutput = (
  data: Record<string, unknown>,
): data is Record<string, unknown> & PickersOutput =>
  isNullableString(data.country) &&
  isStringList(data.tags) &&
  isNullableString(data.city) &&
  typeof data.cityLoading === 'boolean' &&
  isStringList(data.keywords) &&
  typeof data.page === 'number' &&
  typeof data.pageSize === 'number' &&
  typeof data.linkPage === 'number';

const parsePickersOutput = (text: string): PickersOutput => {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data) || !isPickersOutput(data)) {
    throw new Error(`Unexpected pickers output: ${text}`);
  }
  return data;
};

const ROOT =
  'xpath=ancestor::*[contains(@class, "nui-select") or contains(@class, "nui-combobox")][1]';

export class PickersSection {
  readonly countryTrigger: Locator;
  readonly tagsTrigger: Locator;
  readonly cityInput: Locator;
  readonly keywordsInput: Locator;
  readonly pagination: Locator;
  readonly linkPagination: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.countryTrigger = page.getByTestId('pick-select');
    this.tagsTrigger = page.getByTestId('pick-multi');
    this.cityInput = page.getByTestId('pick-combobox');
    this.keywordsInput = page.getByTestId('pick-keywords');
    this.pagination = page.getByTestId('pick-pagination');
    this.linkPagination = page.getByTestId('pick-pagination-links');
    this.output = page.getByTestId('pickers-output');
  }

  get listbox(): Locator {
    return this.page.getByRole('listbox').and(this.page.locator('.nui-listbox'));
  }

  get emptyState(): Locator {
    return this.listbox.locator('.nui-empty');
  }

  option(label: string): Locator {
    return this.listbox.getByRole('option', { name: label });
  }

  clearButton(control: Locator): Locator {
    return control.locator(ROOT).getByRole('button', { name: 'Очистить' });
  }

  chips(input: Locator): Locator {
    return input.locator(ROOT).locator('.nui-chip__label');
  }

  get loadingStatus(): Locator {
    return this.listbox.locator('.nui-listbox__status');
  }

  pageButton(page: number): Locator {
    return this.pagination.getByRole('button', { name: `Страница ${page}` });
  }

  get nextButton(): Locator {
    return this.pagination.getByRole('button', { name: 'Следующая' });
  }

  get pageSizeTrigger(): Locator {
    return this.pagination.getByRole('combobox');
  }

  get rangeText(): Locator {
    return this.pagination.locator('.nui-pagination__range');
  }

  get status(): Locator {
    return this.pagination.locator('.nui-pagination__status');
  }

  pageLink(page: number): Locator {
    return this.linkPagination.getByRole('link', { name: `Страница ${page}` });
  }

  async widthOf(target: Locator): Promise<number> {
    const box = await target.boundingBox();
    if (!box) {
      throw new Error('Element has no bounding box');
    }
    return box.width;
  }

  async readOutput(): Promise<PickersOutput> {
    return parsePickersOutput(await this.output.innerText());
  }
}
