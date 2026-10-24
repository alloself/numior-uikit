import type { Locator, Page } from '@playwright/test';
import type { XlsxFile } from '../helpers/xlsx';

export class BookSection {
  readonly section: Locator;
  readonly sheet: Locator;
  readonly sheetSelect: Locator;
  readonly open: Locator;

  constructor(readonly page: Page) {
    this.section = page.locator('section[aria-labelledby="book-title"]');
    this.sheet = page.getByTestId('book');
    this.sheetSelect = page.getByTestId('book-sheet');
    this.open = page.getByTestId('book-open');
  }

  get grid(): Locator {
    return this.sheet.getByRole('grid');
  }

  columnHeader(name: string): Locator {
    return this.grid.getByRole('columnheader', { name, exact: true });
  }

  row(label: string): Locator {
    return this.grid.getByRole('row').filter({
      has: this.page.getByRole('rowheader', { name: label, exact: true }),
    });
  }

  cell(rowLabel: string, column: number): Locator {
    return this.row(rowLabel).locator(`[aria-colindex="${String(column + 2)}"]`);
  }

  merged(rowLabel: string, column: number): Promise<boolean> {
    return this.cell(rowLabel, column).evaluate((cell) =>
      cell.classList.contains('nui-table__cell--merged'),
    );
  }

  async chooseSheet(name: string): Promise<void> {
    await this.sheetSelect.click();
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  async openFile(file: XlsxFile): Promise<void> {
    await this.section.locator('input[type="file"]').setInputFiles(file);
  }

  bordered(): Promise<boolean> {
    return this.sheet
      .locator('.nui-table')
      .evaluate((table) => table.classList.contains('nui-table--bordered'));
  }

  async scrollBody(pixels: number): Promise<void> {
    await this.sheet
      .locator('.nui-table__viewport')
      .evaluate((scroller, top) => scroller.scrollTo({ top }), pixels);
  }
}
