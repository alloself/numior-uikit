import type { Locator, Page } from '@playwright/test';
import { boxOf, type Box } from '../helpers/geometry';
import type { XlsxFile } from '../helpers/xlsx';

interface CellLabel {
  readonly row: string;
  readonly col: number;
}

export class BookSection {
  readonly section: Locator;
  readonly sheet: Locator;
  readonly sheetSelect: Locator;
  readonly open: Locator;
  readonly changes: Locator;
  readonly editor: Locator;
  readonly nameBox: Locator;
  readonly formula: Locator;
  readonly expand: Locator;
  readonly referenceFrames: Locator;
  readonly paintedReferences: Locator;
  readonly frameGrips: Locator;
  readonly functions: Locator;
  readonly hint: Locator;
  readonly signature: Locator;
  readonly summary: Locator;
  readonly currentArgument: Locator;

  constructor(readonly page: Page) {
    this.section = page.locator('section[aria-labelledby="book-title"]');
    this.sheet = page.getByTestId('book');
    this.sheetSelect = page.getByTestId('book-sheet');
    this.open = page.getByTestId('book-open');
    this.changes = page.getByTestId('book-changes');
    this.editor = this.sheet.locator('.nui-table__editor input');
    this.nameBox = this.sheet.getByRole('textbox', { name: 'Поле имени' });
    this.formula = this.sheet.getByRole('textbox', { name: 'Строка формул' });
    this.expand = this.sheet.getByRole('button', { name: 'Развернуть строку формул' });
    this.referenceFrames = this.sheet.locator('.nui-spreadsheet__ref');
    this.paintedReferences = this.sheet.locator('.nui-spreadsheet__token');
    this.frameGrips = this.referenceFrames.locator('.nui-spreadsheet__grip');
    this.functions = this.sheet.getByRole('listbox', { name: 'Функции' });
    this.hint = this.sheet.getByRole('list', { name: 'Аргументы функции' });
    this.signature = this.hint.locator('.nui-row__title');
    this.summary = this.hint.locator('.nui-row__description');
    this.currentArgument = this.hint.locator('.nui-spreadsheet__hint-part--current');
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

  editorCutsTextShort(): Promise<boolean> {
    return this.editor.evaluate((field) => {
      const editor = field.closest('.nui-table__editor');
      const viewport = field.closest('.nui-table__viewport');

      if (!(field instanceof HTMLInputElement) || editor === null || viewport === null) {
        return true;
      }

      const atEdge =
        editor.getBoundingClientRect().right >= viewport.getBoundingClientRect().right - 4;

      return field.scrollWidth > field.clientWidth && !atEdge;
    });
  }

  viewportBox(): Promise<Box> {
    return boxOf(this.sheet.locator('.nui-table__viewport'));
  }

  editorBox(): Promise<Box> {
    return boxOf(this.editor);
  }

  merged(rowLabel: string, column: number): Promise<boolean> {
    return this.cell(rowLabel, column).evaluate((cell) =>
      cell.classList.contains('nui-table__cell--merged'),
    );
  }

  async enter(rowLabel: string, column: number, text: string): Promise<void> {
    await this.cell(rowLabel, column).click();
    await this.page.keyboard.press('F2');
    await this.editor.fill(text);
    await this.page.keyboard.press('Enter');
  }

  async dragAcross(from: CellLabel, to: CellLabel): Promise<void> {
    const start = await boxOf(this.cell(from.row, from.col));
    const end = await boxOf(this.cell(to.row, to.col));

    await this.page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 6 });
    await this.page.mouse.up();
  }

  async dragGrip(grip: string, to: CellLabel): Promise<void> {
    const handle = await boxOf(
      this.referenceFrames.first().locator(`.nui-spreadsheet__grip--${grip}`),
    );

    const end = await boxOf(this.cell(to.row, to.col));

    const edge =
      handle.width > handle.height ? handle.y + handle.height - 1 : handle.y + handle.height / 2;

    await this.page.mouse.move(handle.x + handle.width / 2, edge);
    await this.page.mouse.down();
    await this.page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 6 });
    await this.page.mouse.up();
  }

  async goTo(name: string): Promise<void> {
    await this.nameBox.click();
    await this.nameBox.fill(name);
    await this.page.keyboard.press('Enter');
  }

  async enterInFormulaBar(rowLabel: string, column: number, text: string): Promise<void> {
    await this.cell(rowLabel, column).click();
    await this.formula.click();
    await this.formula.fill(text);
    await this.page.keyboard.press('Enter');
  }

  async startEdit(rowLabel: string, column: number): Promise<void> {
    await this.cell(rowLabel, column).click();
    await this.page.keyboard.press('F2');
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
