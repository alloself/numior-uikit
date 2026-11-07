import { expect, type Locator, type Page } from '@playwright/test';
import { copiedTexts, stubClipboard } from '../helpers/clipboard';
import { paintedRgbAt, rgbDelta, type Rgb } from '../helpers/color';
import { boxOf, type Box } from '../helpers/geometry';
import type { XlsxFile } from '../helpers/xlsx';

interface CellLabel {
  readonly row: string;
  readonly col: number;
}

export class BookSection {
  readonly section: Locator;
  readonly sheet: Locator;
  readonly open: Locator;
  readonly changes: Locator;
  readonly status: Locator;
  readonly load: Locator;
  readonly recalc: Locator;
  readonly locale: Locator;
  readonly editor: Locator;
  readonly nameBox: Locator;
  readonly formula: Locator;
  readonly expand: Locator;
  readonly referenceFrames: Locator;
  readonly paintedReferences: Locator;
  readonly cellReferences: Locator;
  readonly frameGrips: Locator;
  readonly functions: Locator;
  readonly hint: Locator;
  readonly signature: Locator;
  readonly summary: Locator;
  readonly currentArgument: Locator;

  constructor(
    readonly page: Page,
    id = 'book',
  ) {
    this.section = page.locator(`section[aria-labelledby="${id}-title"]`);
    this.sheet = page.getByTestId(id);
    this.open = page.getByTestId(`${id}-open`);
    this.changes = page.getByTestId(`${id}-changes`);
    this.status = page.getByTestId(`${id}-status`);
    this.load = page.getByTestId(`${id}-load`);
    this.recalc = page.getByTestId(`${id}-recalc`);
    this.locale = page.getByTestId(`${id}-locale`);
    this.editor = this.sheet.locator('.nui-table__editor input');
    this.nameBox = this.sheet.getByRole('textbox', { name: 'Поле имени' });
    this.formula = this.sheet.getByRole('textbox', { name: 'Строка формул' });
    this.expand = this.sheet.getByRole('button', { name: 'Развернуть строку формул' });
    this.referenceFrames = this.sheet.locator('.nui-spreadsheet__ref');

    this.paintedReferences = this.sheet.locator('.nui-spreadsheet__mirror .nui-spreadsheet__token');

    this.cellReferences = this.sheet.locator('.nui-spreadsheet__editor .nui-spreadsheet__token');
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

  async fillAt(rowLabel: string, column: number): Promise<Rgb> {
    const [corner] = await paintedRgbAt(this.cell(rowLabel, column), [[4, 4]]);

    return corner ?? [0, 0, 0];
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

  get fillGrip(): Locator {
    return this.sheet.locator('.nui-spreadsheet__fill-grip');
  }

  async leaveSheet(): Promise<void> {
    await this.section.getByRole('heading').first().click();
  }

  async dragFill(to: CellLabel): Promise<void> {
    await this.holdFill(to);
    await this.releaseFill();
  }

  async holdFill(to: CellLabel): Promise<void> {
    const grip = await boxOf(this.fillGrip);
    const end = await boxOf(this.cell(to.row, to.col));

    await this.page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 6 });
  }

  async releaseFill(): Promise<void> {
    await this.page.mouse.up();
  }

  async fillGripBelow(cell: CellLabel): Promise<boolean> {
    const grip = await boxOf(this.fillGrip);
    const box = await boxOf(this.cell(cell.row, cell.col));

    return Math.abs(grip.y + grip.height / 2 - (box.y + box.height)) <= grip.height / 2;
  }

  async fillGripWhole(): Promise<boolean> {
    return this.fillGrip.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const x = box.x + box.width / 2 + 2;
      const y = box.y + box.height / 2 + 2;

      return element.ownerDocument.elementFromPoint(x, y) === element;
    });
  }

  get fillClear(): Locator {
    return this.sheet.locator('.nui-spreadsheet__fill-clear');
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

  async holdPastBottom(handle: Locator, until: () => Promise<boolean>): Promise<void> {
    const grip = await boxOf(handle);
    const viewport = await boxOf(this.sheet.locator('.nui-table__viewport'));
    const x = grip.x + grip.width / 2;

    await this.page.mouse.move(x, grip.y + grip.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(x, viewport.y + viewport.height - 4, { steps: 6 });
    await expect.poll(until, { timeout: 10_000 }).toBe(true);
    await this.page.mouse.up();
  }

  async gripReachable(grip: string): Promise<boolean> {
    const handle = this.referenceFrames.first().locator(`.nui-spreadsheet__grip--${grip}`);

    await handle.scrollIntoViewIfNeeded();

    return handle.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const view = element.closest('.nui-table__viewport')?.getBoundingClientRect() ?? box;
      const left = Math.max(box.left, view.left);
      const right = Math.min(box.right, view.right);

      return document.elementFromPoint((left + right) / 2, box.y + box.height / 2) === element;
    });
  }

  async goTo(name: string): Promise<void> {
    await this.nameBox.click();
    await this.nameBox.fill(name);
    await this.page.keyboard.press('Enter');
  }

  async enterAt(address: string, text: string): Promise<void> {
    await this.goTo(address);
    await this.page.keyboard.press('F2');
    await this.editor.fill(text);
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
    await this.sheetTab(name).click();
  }

  sheetTab(name: string): Locator {
    return this.sheet.getByRole('tab', { name, exact: true });
  }

  get addSheetButton(): Locator {
    return this.sheet.getByRole('button', { name: 'Добавить лист' });
  }

  get sheetNameField(): Locator {
    return this.page.getByRole('textbox', { name: 'Имя листа' });
  }

  async renameSheet(name: string, next: string): Promise<void> {
    await this.sheetTab(name).dblclick();
    await this.sheetNameField.fill(next);
    await this.page.keyboard.press('Enter');
  }

  async sheetMenu(name: string, item: string): Promise<void> {
    await this.sheetTab(name).click({ button: 'right' });
    await this.page.getByRole('menuitem', { name: item, exact: true }).click();
  }

  get clipFrame(): Locator {
    return this.sheet.locator('.nui-spreadsheet__clip');
  }

  stubClipboard(): Promise<void> {
    return stubClipboard(this.page);
  }

  async lastCopy(): Promise<string> {
    return (await copiedTexts(this.page)).at(-1) ?? '';
  }

  async paste(text: string): Promise<void> {
    await this.page.evaluate((value) => {
      const data = new DataTransfer();

      data.setData('text/plain', value);

      const event = new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      });

      if (event.clipboardData?.getData('text/plain') !== value) {
        Object.defineProperty(event, 'clipboardData', { value: data });
      }
      document.activeElement?.dispatchEvent(event);
    }, text);
  }

  async cellMenu(rowLabel: string, column: number, item: string): Promise<void> {
    await this.cell(rowLabel, column).click({ button: 'right' });
    await this.page.getByRole('menuitem', { name: item, exact: true }).click();
  }

  get format(): Locator {
    return this.page.getByTestId('formulas-format');
  }

  async chooseFormat(name: string): Promise<void> {
    await this.format.click();
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  async clear(rowLabel: string, column: number): Promise<void> {
    await this.cell(rowLabel, column).click();
    await this.page.keyboard.press('Delete');
  }

  async switchLocale(name: string): Promise<void> {
    await this.locale.getByRole('radio', { name, exact: true }).click();
  }

  get report(): Locator {
    return this.sheet.locator('.nui-alert:not(.nui-alert--closed)');
  }

  async recalculateReport(): Promise<void> {
    await this.report.getByRole('button', { name: 'Пересчитать' }).click();
  }

  async openFile(file: XlsxFile): Promise<void> {
    await this.section.locator('input[type="file"]').setInputFiles(file);
  }

  bordered(): Promise<boolean> {
    return this.sheet
      .locator('.nui-table')
      .evaluate((table) => table.classList.contains('nui-table--bordered'));
  }

  async tintOver(target: Locator, outside: Locator, inset: number): Promise<number> {
    const [box, other, root] = await Promise.all([
      boxOf(target),
      boxOf(outside),
      boxOf(this.sheet),
    ]);

    const y = other.y + other.height / 2 - root.y;

    const [inner, outer] = await paintedRgbAt(this.sheet, [
      [box.x + inset - root.x, y],
      [other.x + other.width / 2 - root.x, y],
    ]);

    return inner === undefined || outer === undefined ? Number.NaN : rgbDelta(inner, outer);
  }

  scrollTop(): Promise<number> {
    return this.sheet.locator('.nui-table__viewport').evaluate((scroller) => scroller.scrollTop);
  }

  async scrollBody(pixels: number): Promise<void> {
    await this.sheet
      .locator('.nui-table__viewport')
      .evaluate((scroller, top) => scroller.scrollTo({ top }), pixels);
  }
}
