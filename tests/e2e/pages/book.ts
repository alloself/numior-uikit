import { readFile } from 'node:fs/promises';
import { expect, type Locator, type Page } from '@playwright/test';
import { copiedTexts, stubClipboard } from '../helpers/clipboard';
import { paintedRgbAt, rgbDelta, type Rgb } from '../helpers/color';
import { boxOf, dragAcross, renderedWidth, type Box, type Point } from '../helpers/geometry';
import type { XlsxFile } from '../helpers/xlsx';
import { PivotPanel } from './pivot-panel';

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

  columnEdge(name: string): Locator {
    return this.columnHeader(name).locator('.nui-table__resizer');
  }

  columnWidth(name: string): Promise<number> {
    return renderedWidth(this.columnHeader(name));
  }

  async dragColumnEdge(name: string, dx: number): Promise<void> {
    await this.columnEdge(name).scrollIntoViewIfNeeded();
    await dragAcross(this.columnEdge(name), dx);
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

  editorFrame(): Promise<Box> {
    return boxOf(this.sheet.locator('.nui-table__editor'));
  }

  lineColor(rowLabel: string, column: number): Promise<string> {
    return this.cell(rowLabel, column).evaluate((cell) => getComputedStyle(cell).borderBottomColor);
  }

  async fillAt(rowLabel: string, column: number): Promise<Rgb> {
    const [corner] = await paintedRgbAt(this.cell(rowLabel, column), [[4, 4]]);

    return corner ?? [0, 0, 0];
  }

  barShare(rowLabel: string, column: number): Promise<number> {
    return this.cell(rowLabel, column).evaluate((cell) => {
      const bar = Number.parseFloat(getComputedStyle(cell, '::after').inlineSize);

      return Number.isNaN(bar) ? 0 : bar / cell.getBoundingClientRect().width;
    });
  }

  async barRgb(rowLabel: string, column: number): Promise<Rgb> {
    const box = await boxOf(this.cell(rowLabel, column));
    const [inside] = await paintedRgbAt(this.cell(rowLabel, column), [[4, box.height / 2]]);

    return inside ?? [0, 0, 0];
  }

  iconGlyph(rowLabel: string, column: number): Promise<string[]> {
    return this.cell(rowLabel, column)
      .locator('.nui-table__icon svg')
      .evaluate((glyph) => [...glyph.classList]);
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

  get note(): Locator {
    return this.sheet.locator('.nui-spreadsheet__note--shown');
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

  editorIn(rowLabel: string, column: number): Locator {
    return this.cell(rowLabel, column).locator('.nui-table__editor input');
  }

  async typeAtCaret(text: string, stepsBack = 0): Promise<void> {
    for (let step = 0; step < stepsBack; step += 1) {
      await this.page.keyboard.press('ArrowLeft');
    }

    await this.page.keyboard.type(text);
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

  async openSheetMenu(name: string): Promise<void> {
    await this.sheetTab(name).click({ button: 'right' });
  }

  async sheetMenu(name: string, item: string): Promise<void> {
    await this.openSheetMenu(name);
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

  get pivot(): PivotPanel {
    return new PivotPanel(this.page, this.sheet);
  }

  get rules(): Locator {
    return this.sheet.getByRole('dialog', { name: 'Условное форматирование' });
  }

  get ruleItems(): Locator {
    return this.rules.getByRole('listitem');
  }

  get ruleTitles(): Locator {
    return this.rules.locator('.nui-spreadsheet-rules__description');
  }

  get litFrames(): Locator {
    return this.sheet.locator('.nui-spreadsheet__lit');
  }

  async openRules(rowLabel: string, column: number): Promise<void> {
    await this.cellMenu(rowLabel, column, 'Условное форматирование…');
  }

  async deleteRule(index: number): Promise<void> {
    await this.ruleItems.nth(index).hover();

    await this.ruleItems
      .nth(index)
      .getByRole('button', { name: /^Удалить/ })
      .click();
  }

  get ruleEditor(): Locator {
    return this.rules.locator('form');
  }

  ruleField(label: string): Locator {
    return this.ruleEditor.getByLabel(label, { exact: true });
  }

  async addRule(): Promise<void> {
    await this.rules.getByRole('button', { name: 'Добавить правило' }).click();
  }

  async editRule(index: number): Promise<void> {
    await this.ruleItems.nth(index).hover();

    await this.ruleItems
      .nth(index)
      .getByRole('button', { name: /^Изменить/ })
      .click();
  }

  async saveRule(): Promise<void> {
    await this.ruleEditor.getByRole('button', { name: 'Готово' }).click();
  }

  async dragRule(from: number, to: number): Promise<void> {
    const source = this.ruleItems.nth(from);

    await source.hover();

    const grip = await boxOf(source.getByRole('button', { name: /^Переместить/ }));
    const target = await boxOf(this.ruleItems.nth(to));

    await this.page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await this.page.mouse.down();

    await this.page.mouse.move(grip.x + grip.width / 2, target.y + target.height * 0.8, {
      steps: 8,
    });

    await this.page.mouse.up();
  }

  async cellMenu(rowLabel: string, column: number, item: string): Promise<void> {
    await this.openCellMenu(rowLabel, column);
    await this.page.getByRole('menuitem', { name: item, exact: true }).click();
  }

  async openCellMenu(rowLabel: string, column: number): Promise<void> {
    await this.cell(rowLabel, column).click({ button: 'right' });
  }

  get cellMenuList(): Locator {
    return this.page.getByRole('menu');
  }

  async insideScreen(target: Locator): Promise<boolean> {
    const box = await boxOf(target);
    const width = this.page.viewportSize()?.width ?? 0;

    return box.x >= 0 && box.x + box.width <= width;
  }

  async longPress(rowLabel: string, column: number): Promise<void> {
    const cell = this.cell(rowLabel, column);
    const box = await boxOf(cell);

    const init = {
      bubbles: true,
      button: 0,
      isPrimary: true,
      pointerId: 11,
      pointerType: 'touch',
      clientX: box.x + box.width / 2,
      clientY: box.y + box.height / 2,
    };

    await cell.dispatchEvent('pointerdown', init);
    await expect(this.cellMenuList).toBeVisible();
    await cell.dispatchEvent('pointerup', init);
  }

  async tapCell(rowLabel: string, column: number, times = 1): Promise<void> {
    const box = await boxOf(this.cell(rowLabel, column));

    for (let tap = 0; tap < times; tap += 1) {
      await this.page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }
  }

  smallestHandleTarget(): Promise<number> {
    return this.sheet.locator('.nui-spreadsheet__handle').evaluateAll((handles) =>
      Math.min(
        ...handles.map((handle) => {
          const target = getComputedStyle(handle, '::before');

          return Math.min(Number.parseFloat(target.width), Number.parseFloat(target.height));
        }),
      ),
    );
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

  get fileBar(): Locator {
    return this.sheet.locator('.nui-spreadsheet__file');
  }

  get fileName(): Locator {
    return this.fileBar.locator('.nui-spreadsheet__file-text');
  }

  async fileNameWidth(): Promise<number> {
    return (await boxOf(this.fileName)).width;
  }

  get fileEdited(): Locator {
    return this.fileBar.locator('.nui-spreadsheet__file-edited');
  }

  get fileDialog(): Locator {
    return this.sheet.locator('dialog.nui-dialog');
  }

  get fileFailure(): Locator {
    return this.sheet.locator('.nui-alert--tone-error .nui-alert__title');
  }

  async confirmFileDialog(name: string): Promise<void> {
    await this.fileDialog.getByRole('button', { name }).click();
  }

  async saveFile(): Promise<XlsxFile> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.fileBar.getByRole('button', { name: 'Сохранить' }).click(),
    ]);

    return {
      name: download.suggestedFilename(),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: await readFile(await download.path()),
    };
  }

  async openFile(file: XlsxFile): Promise<void> {
    await this.section.locator('input[type="file"]').setInputFiles(file);
  }

  gridlines(): Promise<boolean> {
    return this.sheet
      .locator('.nui-table')
      .evaluate((table) => table.classList.contains('nui-table--gridlines'));
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

  async scrollAcross(pixels: number): Promise<void> {
    await this.sheet
      .locator('.nui-table__viewport')
      .evaluate((scroller, left) => scroller.scrollTo({ left }), pixels);
  }

  async scrollBody(pixels: number): Promise<void> {
    await this.sheet
      .locator('.nui-table__viewport')
      .evaluate((scroller, top) => scroller.scrollTo({ top }), pixels);
  }

  chartRowGaps(row: string, steps: number, stride: number): Promise<number[]> {
    return this.sheet.evaluate(
      async (root, { label, count, step }) => {
        const scroller = root.querySelector('.nui-table__viewport');
        const chart = root.querySelector('.nui-spreadsheet__drawing--kind-chart');

        const headerTop = (): number | undefined =>
          [...root.querySelectorAll('[role="rowheader"]')]
            .find((cell) => cell.textContent.trim() === label)
            ?.getBoundingClientRect().top;

        const gapAt = async (index: number, gaps: number[]): Promise<number[]> => {
          if (index === count || scroller === null || chart === null) {
            return gaps;
          }
          scroller.scrollTop = index * step;
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);

          const top = headerTop();

          return gapAt(
            index + 1,
            top === undefined ? gaps : [...gaps, chart.getBoundingClientRect().top - top],
          );
        };

        return gapAt(0, []);
      },
      { label: row, count: steps, step: stride },
    );
  }

  get charts(): Locator {
    return this.sheet.locator('.nui-spreadsheet__drawing--kind-chart');
  }

  get selectedDrawing(): Locator {
    return this.sheet.locator('.nui-spreadsheet__drawing--selected');
  }

  get focusedCell(): Locator {
    return this.sheet.locator('[role="gridcell"]:focus');
  }

  get chartTitle(): Locator {
    return this.charts.locator('.nui-spreadsheet__chart-title');
  }

  get chartLegend(): Locator {
    return this.charts.locator('.nui-chart__legend-item');
  }

  get placeholders(): Locator {
    return this.sheet.locator('.nui-spreadsheet__drawing--kind-foreign');
  }

  picture(alt: string): Locator {
    return this.sheet.locator(`.nui-spreadsheet__picture[alt="${alt}"]`);
  }

  pictureLoaded(alt: string): Promise<boolean> {
    return this.picture(alt).evaluate(
      (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
    );
  }

  async insertChart(rowLabel: string, column: number, kind: string): Promise<void> {
    await this.cell(rowLabel, column).click({ button: 'right' });
    await this.page.getByRole('menuitem', { name: 'Вставить диаграмму', exact: true }).click();
    await this.page.getByRole('menuitem', { name: kind, exact: true }).click();
  }

  async pngOf(width: number, height: number): Promise<Buffer> {
    const url = await this.page.evaluate(
      ([across, down]) => {
        const canvas = document.createElement('canvas');

        canvas.width = across ?? 1;
        canvas.height = down ?? 1;
        return canvas.toDataURL('image/png');
      },
      [width, height],
    );

    return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  }

  async insertPicture(rowLabel: string, column: number, png: Buffer): Promise<void> {
    await this.cell(rowLabel, column).click({ button: 'right' });

    const chooser = this.page.waitForEvent('filechooser');

    await this.page.getByRole('menuitem', { name: 'Вставить картинку…', exact: true }).click();

    const dialog = await chooser;

    await dialog.setFiles({ name: 'picture.png', mimeType: 'image/png', buffer: png });
  }

  async pasteImage(png: Buffer): Promise<void> {
    await this.page.evaluate((base64) => {
      const bytes = Uint8Array.from(atob(base64), (letter) => letter.charCodeAt(0));
      const file = new File([bytes], 'shot.png', { type: 'image/png' });
      const event = new Event('paste', { bubbles: true, cancelable: true });

      Object.defineProperty(event, 'clipboardData', {
        value: { getData: () => '', files: [file] },
      });

      document.activeElement?.dispatchEvent(event);
    }, png.toString('base64'));
  }

  get pictures(): Locator {
    return this.sheet.locator('.nui-spreadsheet__drawing--kind-picture');
  }

  async frameClearsRowHeaders(): Promise<boolean> {
    const frame = await boxOf(this.selectionFrame);
    const header = await boxOf(this.sheet.getByRole('rowheader').first());

    return frame.x >= header.x + header.width;
  }

  get chartSettings(): Locator {
    return this.page.getByRole('dialog', { name: 'Настройки диаграммы' });
  }

  async openChartSettings(): Promise<void> {
    await this.charts.first().click();

    await this.sheet
      .getByRole('button', { name: 'Настройки диаграммы', includeHidden: true })
      .click();
  }

  async chooseChartKind(kind: string): Promise<void> {
    await this.chartSettings.getByRole('combobox', { name: 'Тип диаграммы' }).click();
    await this.page.getByRole('option', { name: kind, exact: true }).click();
  }

  async setChartTitle(title: string): Promise<void> {
    const field = this.chartSettings.getByRole('textbox', { name: 'Заголовок' });

    await field.fill(title);
    await field.press('Enter');
  }

  async turnChartLegendOff(): Promise<void> {
    await this.chartSettings.getByText('Легенда', { exact: true }).click();
  }

  get selectionFrame(): Locator {
    return this.sheet.locator('.nui-spreadsheet__drawing-frame--selected');
  }

  handle(grip: string): Locator {
    return this.selectionFrame.locator(`.nui-spreadsheet__handle--${grip}`);
  }

  async dragBy(target: Locator, across: number, down: number): Promise<void> {
    const box = await boxOf(target);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + across / 2, y + down / 2, { steps: 4 });
    await this.page.mouse.move(x + across, y + down, { steps: 4 });
    await this.page.mouse.up();
  }

  bars(slot: number): Locator {
    return this.charts.locator(`.nui-chart__bar--slot-${String(slot)}`);
  }

  barHeights(slot: number): Promise<number[]> {
    return this.bars(slot).evaluateAll((bars) =>
      bars.map((bar) => (bar instanceof SVGGraphicsElement ? bar.getBBox().height : 0)),
    );
  }

  async cellCorner(rowLabel: string, column: number): Promise<Point> {
    const box = await boxOf(this.cell(rowLabel, column));

    return { x: box.x, y: box.y };
  }
}
