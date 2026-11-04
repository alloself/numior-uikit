import type { Locator, Page } from '@playwright/test';
import { boxOf } from '../helpers/geometry';
import {
  isString,
  listOf,
  nullable,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';
import { sectionScope } from '../helpers/axe';

export type DateRangeOutput = Guarded<typeof isRange>;

export type DatesOutput = Guarded<typeof isDatesOutput>;

const isRange = shapeOf({ start: nullable(isString), end: nullable(isString) });

const isDatesOutput = shapeOf({
  date: nullable(isString),
  month: nullable(isString),
  dates: listOf(isString),
  range: isRange,
  picked: nullable(isString),
  period: isRange,
  moment: nullable(isString),
  delivery: nullable(isString),
  today: isString,
});

const parseDatesOutput = (text: string): DatesOutput =>
  parseAs(text, isDatesOutput, 'dates output');

const PICKER_ROOT = 'xpath=ancestor::*[contains(@class, "nui-date-picker")][1]';
const MONTH_PREFIX = 'YYYY-MM-'.length;

export class DatesSection {
  readonly scope = sectionScope('dates');

  readonly calendar: Locator;
  readonly multiple: Locator;
  readonly range: Locator;
  readonly picker: Locator;
  readonly rangePicker: Locator;
  readonly timePicker: Locator;
  readonly clickPicker: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.calendar = page.getByTestId('date-calendar');
    this.multiple = page.getByTestId('date-multiple');
    this.range = page.getByTestId('date-range');
    this.picker = page.getByTestId('date-picker').locator(PICKER_ROOT);
    this.rangePicker = page.getByTestId('date-range-picker').locator(PICKER_ROOT);
    this.timePicker = page.getByTestId('date-time-picker').locator(PICKER_ROOT);
    this.clickPicker = page.getByTestId('date-picker-click').locator(PICKER_ROOT);
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
    const start = await boxOf(this.day(scope, from));
    const end = await boxOf(this.day(scope, to));

    await this.page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 4 });
    await this.page.mouse.up();
  }

  async readOutput(): Promise<DatesOutput> {
    return parseDatesOutput(await this.output.innerText());
  }

  async dayOfThisMonth(day: number): Promise<string> {
    const { today } = await this.readOutput();

    return `${today.slice(0, MONTH_PREFIX)}${String(day).padStart(2, '0')}`;
  }

  typed(date: string): string {
    return date.split('-').toReversed().join('.');
  }
}
