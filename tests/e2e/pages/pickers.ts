import type { Locator, Page } from '@playwright/test';
import { boxOf } from '../helpers/geometry';
import {
  isBoolean,
  isNumber,
  isString,
  listOf,
  nullable,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';

export type PickersOutput = Guarded<typeof isPickersOutput>;

const isPickersOutput = shapeOf({
  country: nullable(isString),
  tags: listOf(isString),
  category: nullable(isString),
  city: nullable(isString),
  cityLoading: isBoolean,
  keywords: listOf(isString),
  page: isNumber,
  pageSize: isNumber,
  linkPage: isNumber,
});

const parsePickersOutput = (text: string): PickersOutput =>
  parseAs(text, isPickersOutput, 'pickers output');

const ROOT =
  'xpath=ancestor::*[contains(@class, "nui-select") or contains(@class, "nui-combobox")][1]';

export class PickersSection {
  readonly countryTrigger: Locator;
  readonly longTrigger: Locator;
  readonly tagsTrigger: Locator;
  readonly treeTrigger: Locator;
  readonly cityInput: Locator;
  readonly keywordsInput: Locator;
  readonly pagination: Locator;
  readonly linkPagination: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.countryTrigger = page.getByTestId('pick-select');
    this.longTrigger = page.getByTestId('pick-long');
    this.tagsTrigger = page.getByTestId('pick-multi');
    this.treeTrigger = page.getByTestId('pick-tree');
    this.cityInput = page.getByTestId('pick-combobox');
    this.keywordsInput = page.getByTestId('pick-keywords');
    this.pagination = page.getByTestId('pick-pagination');
    this.linkPagination = page.getByTestId('pick-pagination-links');
    this.output = page.getByTestId('pickers-output');
  }

  get listbox(): Locator {
    return this.page.getByRole('listbox').and(this.page.locator('.nui-list--variant-floating'));
  }

  get emptyState(): Locator {
    return this.listbox.locator('.nui-empty');
  }

  get tree(): Locator {
    return this.page.getByRole('tree').and(this.page.locator('.nui-list--variant-floating'));
  }

  treeItem(label: string): Locator {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.tree.locator('[role="treeitem"]', {
      has: this.page.locator('.nui-row__title', { hasText: new RegExp(`^${escaped}$`) }),
    });
  }

  treeToggleOf(item: Locator): Locator {
    return item.locator('.nui-tree__toggle');
  }

  treeLabelOf(item: Locator): Locator {
    return item.locator('.nui-row__title');
  }

  option(label: string): Locator {
    return this.listbox.getByRole('option', { name: label });
  }

  get longValue(): Locator {
    return this.longTrigger.locator('.nui-select__value');
  }

  longValueOverflows(): Promise<boolean> {
    return this.longValue.evaluate((element) => element.scrollWidth > element.clientWidth);
  }

  longClearGap(): Promise<number> {
    return this.longValue.evaluate((element) => {
      const clear = element.closest('.nui-select')?.querySelector('.nui-select__clear');
      const text = element.getBoundingClientRect();
      const padding = Number.parseFloat(getComputedStyle(element).paddingInlineEnd);

      return clear === null || clear === undefined
        ? Number.NaN
        : clear.getBoundingClientRect().left - (text.right - padding);
    });
  }

  clearButton(control: Locator): Locator {
    return control.locator(ROOT).getByRole('button', { name: 'Очистить' });
  }

  chips(input: Locator): Locator {
    return input.locator(ROOT).locator('.nui-chip__label');
  }

  get loadingStatus(): Locator {
    return this.listbox.locator('.nui-list__status');
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
    const box = await boxOf(target);

    return box.width;
  }

  async readOutput(): Promise<PickersOutput> {
    return parsePickersOutput(await this.output.innerText());
  }
}
