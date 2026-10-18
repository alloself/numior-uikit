import type { Locator, Page } from '@playwright/test';
import { TableCellsSection } from './table-cells';

const COLUMN_WIDTH = 96;

export class FormulasSection extends TableCellsSection {
  readonly section: Locator;
  readonly sheets: Locator;
  readonly status: Locator;
  readonly load: Locator;

  constructor(page: Page) {
    super(page, 'formulas');
    this.section = page.locator('section[aria-labelledby="formulas-title"]');
    this.sheets = page.getByTestId('formulas-sheets');
    this.status = page.getByTestId('formulas-status');
    this.load = page.getByTestId('formulas-load');
  }

  async openSheet(name: string): Promise<void> {
    await this.sheets.getByRole('radio', { name }).click();
  }

  async reveal(row: number, col: number): Promise<Locator> {
    await this.viewport.evaluate(
      (viewport, offset) => {
        viewport.scrollLeft = offset;
      },
      Math.max(0, (col - 1) * COLUMN_WIDTH),
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
