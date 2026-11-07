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
