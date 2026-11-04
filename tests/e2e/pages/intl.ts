import type { Locator, Page } from '@playwright/test';
import { boxOf } from '../helpers/geometry';
import {
  isNumber,
  isString,
  nullable,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';
import { sectionScope } from '../helpers/axe';

export type IntlOutput = Guarded<typeof isIntlOutput>;

const isIntlOutput = shapeOf({
  locale: isString,
  price: nullable(isNumber),
  quantity: nullable(isNumber),
  discount: nullable(isNumber),
  start: nullable(isString),
  precise: nullable(isString),
});

const parseIntlOutput = (text: string): IntlOutput => parseAs(text, isIntlOutput, 'intl output');

const FIELD_ROOT = 'xpath=ancestor::*[contains(@class, "nui-number-field")][1]';

export class IntlSection {
  readonly scope = sectionScope('intl');

  readonly localeSelect: Locator;
  readonly price: Locator;
  readonly quantity: Locator;
  readonly discount: Locator;
  readonly start: Locator;
  readonly precise: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.localeSelect = page.getByTestId('intl-locale');
    this.price = page.getByTestId('number-price');
    this.quantity = page.getByTestId('number-quantity');
    this.discount = page.getByTestId('number-percent');
    this.start = page.getByTestId('time-start');
    this.precise = page.getByTestId('time-precise');
    this.output = page.getByTestId('intl-output');
  }

  segment(group: Locator, name: string): Locator {
    return group.getByRole('spinbutton', { name, exact: true });
  }

  segments(group: Locator): Locator {
    return group.getByRole('spinbutton');
  }

  stepperOf(control: Locator, direction: 'up' | 'down'): Locator {
    return control.locator(FIELD_ROOT).locator(`.nui-number-field__stepper--${direction}`);
  }

  clockOf(group: Locator, label: string): Locator {
    return group.locator('..').getByRole('button', { name: label });
  }

  panelOf(group: Locator): Locator {
    return group.locator('..').locator('.nui-time-field__panel');
  }

  wheelOf(group: Locator, label: string): Locator {
    return this.panelOf(group).getByRole('spinbutton', { name: label });
  }

  wheelItem(group: Locator, label: string, text: string): Locator {
    return this.wheelOf(group, label)
      .locator('.nui-time-field__wheel-item')
      .filter({ hasText: new RegExp(`^\\s*${text}\\s*$`) });
  }

  async turnWheel(group: Locator, label: string, rows: number): Promise<void> {
    const wheel = this.wheelOf(group, label);
    const row = await boxOf(wheel.locator('.nui-time-field__wheel-item').first());

    await wheel.hover();
    await this.page.mouse.wheel(0, rows * row.height);
  }

  frameOf(control: Locator): Locator {
    return control.locator('..');
  }

  async setLocale(locale: string): Promise<void> {
    await this.localeSelect.click();

    await this.page
      .locator('.nui-select__listbox')
      .getByRole('option', { name: new RegExp(`^${locale}\\s`) })
      .click();
  }

  async readOutput(): Promise<IntlOutput> {
    return parseIntlOutput(await this.output.innerText());
  }
}
