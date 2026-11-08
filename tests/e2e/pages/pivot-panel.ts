import type { Locator, Page } from '@playwright/test';
import { boxOf, type Box } from '../helpers/geometry';

const centreOf = (box: Box): { readonly x: number; readonly y: number } => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

export class PivotPanel {
  readonly dialog: Locator;
  readonly ghost: Locator;

  constructor(
    readonly page: Page,
    sheet: Locator,
  ) {
    this.dialog = sheet.getByRole('dialog', { name: 'Поля сводной таблицы' });
    this.ghost = this.dialog.locator('.nui-spreadsheet-pivot__ghost--shown');
  }

  field(name: string): Locator {
    return this.dialog.getByRole('checkbox', { name, exact: true });
  }

  area(name: string): Locator {
    return this.dialog.getByRole('region', { name, exact: true });
  }

  chips(area: string): Locator {
    return this.area(area).locator('.nui-spreadsheet-pivot__chip');
  }

  chip(area: string, label: string): Locator {
    return this.area(area).getByRole('button', { name: label, exact: true });
  }

  get search(): Locator {
    return this.dialog.getByRole('searchbox');
  }

  get items(): Locator {
    return this.dialog
      .getByRole('group', { name: 'Элементы' })
      .locator('.nui-checkbox__label')
      .filter({ hasNotText: '(Выделить все)' });
  }

  item(name: string): Locator {
    return this.dialog.getByRole('group', { name: 'Элементы' }).getByRole('checkbox', {
      name,
      exact: true,
    });
  }

  input(label: string): Locator {
    return this.dialog.getByRole('textbox', { name: label, exact: true });
  }

  async sortBy(label: string): Promise<void> {
    await this.dialog.getByRole('radio', { name: label, exact: true }).check();
  }

  async choose(label: string, option: string | RegExp): Promise<void> {
    await this.dialog.getByRole('combobox', { name: label, exact: true }).click();
    await this.page.getByRole('option', { name: option }).click();
  }

  async apply(): Promise<void> {
    await this.dialog.getByRole('button', { name: 'Применить', exact: true }).click();
  }

  get focusedChip(): Locator {
    return this.dialog.locator('.nui-spreadsheet-pivot__chip:focus');
  }

  async check(name: string): Promise<void> {
    await this.field(name).check();
  }

  async chooseAction(area: string, chip: string, action: string): Promise<void> {
    await this.chip(area, chip).click();
    await this.page.getByRole('menuitem', { name: action, exact: true }).click();
  }

  get options(): Locator {
    return this.dialog.getByRole('button', { name: 'Параметры сводной таблицы', exact: true });
  }

  option(name: string): Locator {
    return this.page
      .getByRole('menuitemradio', { name, exact: true })
      .or(this.page.getByRole('menuitemcheckbox', { name, exact: true }));
  }

  async openOptions(): Promise<void> {
    if ((await this.options.getAttribute('aria-expanded')) !== 'true') {
      await this.options.click();
    }
  }

  async chooseOption(name: string): Promise<void> {
    await this.openOptions();
    await this.option(name).click();
  }

  async holdChip(area: string, chip: string, to: string): Promise<void> {
    const from = centreOf(await boxOf(this.chip(area, chip)));
    const target = centreOf(await boxOf(this.area(to)));

    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    await this.page.mouse.move(target.x, target.y, { steps: 10 });
  }

  async dragChip(area: string, chip: string, to: string): Promise<void> {
    await this.holdChip(area, chip, to);
    await this.page.mouse.up();
  }

  async dragField(name: string, to: string): Promise<void> {
    const from = await boxOf(
      this.dialog.locator('.nui-spreadsheet-pivot__field', { hasText: name }),
    );

    const target = centreOf(await boxOf(this.area(to)));

    await this.page.mouse.move(from.x + from.width * 0.7, from.y + from.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(target.x, target.y, { steps: 10 });
    await this.page.mouse.up();
  }
}
