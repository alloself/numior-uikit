import type { Locator, Page } from '@playwright/test';
import { TableCellsSection } from './table-cells';

const COLUMN_WIDTH = 96;

export class FormulasSection extends TableCellsSection {
  readonly section: Locator;
  readonly sheets: Locator;
  readonly status: Locator;
  readonly load: Locator;
  readonly locales: Locator;

  constructor(page: Page) {
    super(page, 'formulas');
    this.section = page.locator('section[aria-labelledby="formulas-title"]');
    this.sheets = page.getByTestId('formulas-sheets');
    this.status = page.getByTestId('formulas-status');
    this.load = page.getByTestId('formulas-load');
    this.locales = page.getByTestId('formulas-locale');
  }

  async chooseFormat(name: string): Promise<void> {
    await this.section.getByRole('combobox', { name: 'Формат ячеек' }).click();
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  async fromMenu(row: number, col: number, item: string): Promise<void> {
    const cell = await this.reveal(row, col);

    await cell.click();
    await cell.click({ button: 'right' });
    await this.page.getByRole('menuitem', { name: item }).click();
  }

  async press(row: number, col: number, keys: string): Promise<void> {
    await (await this.reveal(row, col)).click();
    await this.page.keyboard.press(keys);
  }

  async switchLocale(name: string): Promise<void> {
    await this.locales.getByRole('radio', { name }).click();
  }

  async openSheet(name: string): Promise<void> {
    await this.sheets.getByRole('radio', { name }).click();
  }

  async reveal(row: number, col: number): Promise<Locator> {
    await this.viewport.evaluate(
      (viewport, { left, index }) => {
        const first = viewport.querySelector('.nui-table__body > [role="row"]');
        const height = first?.getBoundingClientRect().height ?? 0;

        viewport.scrollLeft = left;
        viewport.scrollTop = Math.max(0, (index - 4) * height);
      },
      { left: Math.max(0, (col - 1) * COLUMN_WIDTH), index: row },
    );

    await this.cell(row, col).waitFor();
    return this.cell(row, col);
  }

  async enter(row: number, col: number, text: string): Promise<void> {
    await (await this.reveal(row, col)).click();
    await this.page.keyboard.type(text);
    await this.page.keyboard.press('Enter');
  }

  async clear(row: number, col: number): Promise<void> {
    await (await this.reveal(row, col)).click();
    await this.page.keyboard.press('Delete');
  }

  async textAt(row: number, col: number): Promise<string> {
    return (await (await this.reveal(row, col)).innerText()).trim();
  }

  async texts(row: number, from: number, to: number): Promise<string[]> {
    const texts: string[] = [];

    for (let col = from; col <= to; col += 1) {
      texts.push(await this.textAt(row, col));
    }
    return texts;
  }
}
