import type { Locator, Page } from '@playwright/test';

export interface IntlOutput {
  readonly locale: string;
  readonly price: number | null;
  readonly quantity: number | null;
  readonly discount: number | null;
  readonly start: string | null;
  readonly precise: string | null;
}

type Guard<T> = (value: unknown) => value is T;

const isNullableNumber: Guard<number | null> = (value): value is number | null =>
  value === null || typeof value === 'number';

const isNullableString: Guard<string | null> = (value): value is string | null =>
  value === null || typeof value === 'string';

const isString: Guard<string> = (value): value is string => typeof value === 'string';

const OUTPUT_GUARDS: { readonly [K in keyof IntlOutput]: Guard<IntlOutput[K]> } = {
  locale: isString,
  price: isNullableNumber,
  quantity: isNullableNumber,
  discount: isNullableNumber,
  start: isNullableString,
  precise: isNullableString,
};

const isIntlOutput = (data: unknown): data is IntlOutput =>
  typeof data === 'object' &&
  data !== null &&
  Object.entries(OUTPUT_GUARDS).every(([key, guard]) => guard(Reflect.get(data, key)));

const parseIntlOutput = (text: string): IntlOutput => {
  const data: unknown = JSON.parse(text);
  if (!isIntlOutput(data)) {
    throw new Error(`Unexpected intl output: ${text}`);
  }
  return data;
};

const FIELD_ROOT = 'xpath=ancestor::*[contains(@class, "nui-number-field")][1]';

export class IntlSection {
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
    const row = await wheel.locator('.nui-time-field__wheel-item').first().boundingBox();

    await wheel.hover();
    await this.page.mouse.wheel(0, rows * (row?.height ?? 36));
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
