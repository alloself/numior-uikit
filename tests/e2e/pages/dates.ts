import type { Locator, Page } from '@playwright/test';

export interface DateRangeOutput {
  readonly start: string | null;
  readonly end: string | null;
}

export interface DatesOutput {
  readonly date: string | null;
  readonly month: string | null;
  readonly dates: string[];
  readonly range: DateRangeOutput;
  readonly picked: string | null;
  readonly period: DateRangeOutput;
  readonly moment: string | null;
  readonly today: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isRange = (value: unknown): value is DateRangeOutput =>
  isRecord(value) && isNullableString(value.start) && isNullableString(value.end);

const field = <T>(
  data: Record<string, unknown>,
  key: string,
  guard: (value: unknown) => value is T,
): T => {
  const value = data[key];

  if (!guard(value)) {
    throw new Error(`Unexpected ${key} in dates output: ${String(value)}`);
  }

  return value;
};

const parseDatesOutput = (text: string): DatesOutput => {
  const data: unknown = JSON.parse(text);

  if (!isRecord(data)) {
    throw new Error('Dates output is not an object');
  }

  return {
    date: field(data, 'date', isNullableString),
    month: field(data, 'month', isNullableString),
    dates: field(data, 'dates', isStringArray),
    range: field(data, 'range', isRange),
    picked: field(data, 'picked', isNullableString),
    period: field(data, 'period', isRange),
    moment: field(data, 'moment', isNullableString),
    today: field(data, 'today', (value): value is string => typeof value === 'string'),
  };
};

const PICKER_ROOT = 'xpath=ancestor::*[contains(@class, "nui-date-picker")][1]';

export class DatesSection {
  readonly calendar: Locator;
  readonly multiple: Locator;
  readonly range: Locator;
  readonly picker: Locator;
  readonly rangePicker: Locator;
  readonly timePicker: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.calendar = page.getByTestId('date-calendar');
    this.multiple = page.getByTestId('date-multiple');
    this.range = page.getByTestId('date-range');
    this.picker = page.getByTestId('date-picker').locator(PICKER_ROOT);
    this.rangePicker = page.getByTestId('date-range-picker').locator(PICKER_ROOT);
    this.timePicker = page.getByTestId('date-time-picker').locator(PICKER_ROOT);
    this.output = page.getByTestId('dates-output');
  }

  day(scope: Locator, date: string): Locator {
    return scope.locator(`time[datetime="${date}"]`).locator('..');
  }

  grid(scope: Locator): Locator {
    return scope.getByRole('grid').first();
  }

  caption(scope: Locator): Locator {
    return scope.locator('.nui-calendar__title').first();
  }

  async captionText(scope: Locator): Promise<string> {
    const parts = await this.caption(scope).locator('button').allInnerTexts();

    return parts.join(' ');
  }

  dialog(scope: Locator): Locator {
    return scope.getByRole('dialog');
  }

  input(scope: Locator, index = 0): Locator {
    return scope.locator('.nui-date-picker__input').nth(index);
  }

  openButton(scope: Locator): Locator {
    return scope.locator('.nui-date-picker__open');
  }

  preset(scope: Locator, label: string): Locator {
    return scope.getByRole('button', { name: label, exact: true });
  }

  async dragDays(scope: Locator, from: string, to: string): Promise<void> {
    const start = await this.day(scope, from).boundingBox();
    const end = await this.day(scope, to).boundingBox();

    if (!start || !end) {
      throw new Error('Day cells have no bounding box');
    }

    await this.page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 4 });
    await this.page.mouse.up();
  }

  async readOutput(): Promise<DatesOutput> {
    return parseDatesOutput(await this.output.innerText());
  }
}
