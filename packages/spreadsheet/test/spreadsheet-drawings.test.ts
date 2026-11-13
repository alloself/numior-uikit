import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  DrawingAnchorKind,
  DrawingKind,
  DrawingPlacement,
  EN_FORMULAS,
  SheetChartGaps,
  SheetChartKind,
  SheetChartStacking,
  createWorkbook,
  numberValue,
  parseFormula,
  textValue,
  type DrawingAnchor,
  type FormulaNode,
  type SheetChart,
  type SheetDrawing,
  type Workbook,
} from '../src/core';
import { SpreadsheetDriver } from './drivers/spreadsheet';
import { stubPopovers } from './support/top-layer';

const mounted: SpreadsheetDriver[] = [];

const sheetOf = (book: Workbook): SpreadsheetDriver => {
  const driver = SpreadsheetDriver.mount({ book, label: 'Drawings' });

  mounted.push(driver);
  return driver;
};

const imageFile = (type = 'image/png'): File => new File(['png bytes'], 'shot.png', { type });

const revoke = vi.fn<(url: string) => void>();

const restorers: Array<() => void> = [];

beforeEach(() => {
  restorers.push(stubPopovers());

  Object.defineProperties(URL, {
    createObjectURL: { configurable: true, value: () => 'blob:logo' },
    revokeObjectURL: { configurable: true, value: revoke },
  });

  vi.stubGlobal('createImageBitmap', async () => ({
    width: 960,
    height: 480,
    close: () => undefined,
  }));
});

afterEach(() => {
  for (const driver of mounted.splice(0)) {
    driver.unmount();
  }

  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
  revoke.mockClear();
  vi.unstubAllGlobals();
  vi.useRealTimers();

  for (const restore of restorers.splice(0)) {
    restore();
  }
});

const reference = (text: string): FormulaNode => {
  const parsed = parseFormula(text, EN_FORMULAS);

  if (!parsed.ok) {
    throw new Error(`${text} is not a reference`);
  }
  return parsed.ast;
};

const CHART: SheetDrawing = {
  id: 'chart',
  name: 'Sales chart',
  alt: '',
  anchor: {
    kind: DrawingAnchorKind.Cells,
    placement: DrawingPlacement.TwoCell,
    from: { row: 5, col: 0, dx: 0, dy: 0 },
    to: { row: 10, col: 3, dx: 0, dy: 0 },
  },
  content: {
    kind: DrawingKind.Chart,
    chart: {
      kind: SheetChartKind.Column,
      title: 'Sales',
      legend: true,
      stacking: SheetChartStacking.None,
      gaps: SheetChartGaps.Break,
      hole: undefined,
      series: [
        {
          name: reference('Sales!$B$1'),
          categories: reference('Sales!$A$2:$A$4'),
          values: reference('Sales!$B$2:$B$4'),
        },
      ],
    },
  },
};

const PICTURE: SheetDrawing = {
  id: 'picture',
  name: 'Logo',
  alt: 'Company logo',
  anchor: {
    kind: DrawingAnchorKind.Cell,
    from: { row: 1, col: 4, dx: 4, dy: 2 },
    width: 90,
    height: 30,
  },
  content: {
    kind: DrawingKind.Picture,
    media: 'xl/media/image1.png',
    type: 'image/png',
    bytes: new Uint8Array([137, 80, 78, 71]),
  },
};

const TWO_SERIES: SheetDrawing = {
  ...CHART,
  content: {
    kind: DrawingKind.Chart,
    chart: {
      kind: SheetChartKind.Column,
      title: 'Sales',
      legend: true,
      stacking: SheetChartStacking.None,
      gaps: SheetChartGaps.Break,
      hole: undefined,
      series: [
        { name: 'One', categories: undefined, values: reference('Sales!$B$2:$B$4') },
        { name: 'Two', categories: undefined, values: reference('Sales!$B$2:$B$4') },
      ],
    },
  },
};

const SHAPE: SheetDrawing = {
  id: 'shape',
  name: 'Arrow',
  alt: '',
  anchor: { kind: DrawingAnchorKind.Point, x: 10, y: 10, width: 64, height: 40 },
  content: { kind: DrawingKind.Foreign, label: 'sp' },
};

const chartInBook = (book: Workbook): SheetChart => {
  const content = book.sheet('Sales')?.layout.drawings[0]?.content;

  if (content?.kind !== DrawingKind.Chart) {
    throw new Error('the first drawing is not a chart');
  }
  return content.chart;
};

const anchorsOf = (book: Workbook): readonly DrawingAnchor[] =>
  (book.sheet('Sales')?.layout.drawings ?? []).map((drawing) => drawing.anchor);

const drawnBook = (drawings: readonly SheetDrawing[]): Workbook => {
  const book = createWorkbook();
  const sales = book.addSheet('Sales');

  sales.cells.set(0, 0, textValue('Item'));
  sales.cells.set(0, 1, textValue('Amount'));

  ['Pen', 'Ink', 'Pad'].forEach((item, index) => {
    sales.cells.set(index + 1, 0, textValue(item));
    sales.cells.set(index + 1, 1, numberValue((index + 1) * 10));
  });

  sales.layout = { ...sales.layout, drawings };
  return book;
};

describe('NuiSpreadsheet drawings', () => {
  it('sizes a chart by the cells under its anchor and draws a bar per value', () => {
    const sheet = sheetOf(drawnBook([CHART]));

    expect([sheet.drawings, sheet.drawingSize(0), sheet.chartBars(0)]).toEqual([
      ['chart: Sales'],
      '193×101',
      3,
    ]);
  });

  it('redraws the chart when a cell under a series changes', async () => {
    const sheet = sheetOf(drawnBook([CHART]));

    await sheet.enter(3, 1, 'text');

    expect(sheet.chartBars(0)).toBe(2);
  });

  it('shows pictures from object urls and revokes them on unmount', async () => {
    const sheet = sheetOf(drawnBook([PICTURE, SHAPE]));

    await sheet.settle();

    expect([sheet.drawings, sheet.drawingSize(0), sheet.drawingSize(1)]).toEqual([
      ['picture: Company logo blob:logo', 'foreign: This object is not supported yet: Arrow (sp)'],
      '90×30',
      '64×40',
    ]);

    mounted.splice(0).forEach((driver) => {
      driver.unmount();
    });

    expect(revoke).toHaveBeenCalledWith('blob:logo');
  });

  it('selects a drawing with a click and announces what the keys do', async () => {
    const sheet = sheetOf(drawnBook([SHAPE, CHART]));

    await sheet.clickDrawing(1);

    expect([sheet.selectedDrawings, sheet.announcement]).toEqual([
      [1],
      'Sales chart selected. Arrows move it, Delete removes it, Tab goes to the next object, Escape returns to the cells',
    ]);
  });

  it('moves a picture by a pixel with an arrow and by a column with Shift', async () => {
    const book = drawnBook([PICTURE]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.press('ArrowRight');
    await sheet.press('ArrowDown');

    expect(anchorsOf(book)[0]).toMatchObject({ from: { row: 1, col: 4, dx: 5, dy: 3 } });

    await sheet.press('ArrowRight', { shift: true });

    expect(anchorsOf(book)[0]).toMatchObject({
      from: { row: 1, col: 5, dx: 5, dy: 3 },
      width: 90,
      height: 30,
    });
  });

  it('keeps both corners of a cell anchored chart in step and stops at the sheet edge', async () => {
    const book = drawnBook([CHART, SHAPE]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.press('ArrowRight');

    expect(anchorsOf(book)[0]).toMatchObject({
      from: { row: 5, col: 0, dx: 1, dy: 0 },
      to: { row: 10, col: 3, dx: 1, dy: 0 },
    });

    await sheet.press('Tab');
    await sheet.press('ArrowLeft', { shift: true });

    expect(anchorsOf(book)[1]).toMatchObject({ x: 0, y: 10, width: 64, height: 40 });
  });

  it('leaves the keys of an open cell menu to the menu while a drawing is selected', async () => {
    const book = drawnBook([PICTURE]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.openCellMenu(2, 0);
    await sheet.pressInCellMenu('ArrowDown');
    await sheet.pressInCellMenu('Delete');
    await sheet.pressInCellMenu('Tab');

    expect([sheet.drawings.length, anchorsOf(book)[0]]).toEqual([1, PICTURE.anchor]);
  });

  it('leaves the keys of a cell editor to the editor and lets the drawing go', async () => {
    const book = drawnBook([PICTURE]);
    const sheet = sheetOf(book);

    await sheet.focus(2, 0);
    await sheet.clickDrawing(0);
    await sheet.press('F2');

    expect([sheet.editing, sheet.selectedDrawings]).toEqual([true, []]);

    await sheet.press('ArrowLeft');
    await sheet.press('Backspace');

    expect([sheet.drawings.length, anchorsOf(book)[0]]).toEqual([1, PICTURE.anchor]);
  });

  it('moves a picture with the pointer in one undoable step', async () => {
    const book = drawnBook([PICTURE]);
    const sheet = sheetOf(book);

    await sheet.dragDrawing(0, { x: 20, y: 30 });

    expect([sheet.selectedDrawings, anchorsOf(book)[0]]).toEqual([
      [0],
      { ...PICTURE.anchor, from: { row: 2, col: 4, dx: 24, dy: 12 } },
    ]);

    await sheet.press('z', { ctrl: true });

    expect(anchorsOf(book)).toEqual([PICTURE.anchor]);
  });

  it('ignores a small jitter and a cancelled drag', async () => {
    const book = drawnBook([PICTURE]);
    const sheet = sheetOf(book);

    await sheet.dragDrawing(0, { x: 1, y: 1 });
    await sheet.dragDrawing(0, { x: 40, y: 40, cancel: true });

    expect(anchorsOf(book)).toEqual([PICTURE.anchor]);
  });

  it('leaves the touch on an unselected drawing to the browser, so the tap becomes a click', async () => {
    const book = drawnBook([PICTURE]);
    const sheet = sheetOf(book);

    const kept = await sheet.touchDrawing(0);

    expect(kept).toBe(true);
  });

  it('leaves an unselected drawing to the finger and drags a selected one', async () => {
    const book = drawnBook([PICTURE]);
    const sheet = sheetOf(book);

    await sheet.dragDrawing(0, { x: 20, y: 0, pointerType: 'touch' });

    expect([sheet.selectedDrawings, anchorsOf(book)]).toEqual([[], [PICTURE.anchor]]);

    await sheet.clickDrawing(0);
    await sheet.dragDrawing(0, { x: 20, y: 0, pointerType: 'touch' });

    expect(anchorsOf(book)[0]).toMatchObject({ from: { row: 1, col: 4, dx: 24, dy: 2 } });
  });

  it('stops a drag at the sheet edge', async () => {
    const book = drawnBook([SHAPE]);
    const sheet = sheetOf(book);

    await sheet.dragDrawing(0, { x: -50, y: -4 });

    expect(anchorsOf(book)[0]).toMatchObject({ x: 0, y: 6, width: 64, height: 40 });
  });

  it('resizes from the end corner and keeps a minimum size', async () => {
    const book = drawnBook([PICTURE]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.dragHandle('bottom-end', { x: 10, y: 5 });

    expect(anchorsOf(book)[0]).toMatchObject({ width: 100, height: 35 });

    await sheet.dragHandle('bottom-end', { x: -500, y: -500 });

    expect(anchorsOf(book)[0]).toMatchObject({ width: 8, height: 8 });
  });

  it('moves the origin when resizing from the start corner', async () => {
    const book = drawnBook([PICTURE]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.dragHandle('top-start', { x: 10, y: 5 });

    expect(anchorsOf(book)[0]).toMatchObject({
      from: { row: 1, col: 4, dx: 14, dy: 7 },
      width: 80,
      height: 25,
    });
  });

  it('resizes one side from an edge handle', async () => {
    const book = drawnBook([PICTURE]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.dragHandle('end', { x: 10, y: 50 });

    expect(anchorsOf(book)[0]).toMatchObject({ width: 100, height: 30 });
  });

  it('keeps the ratio of a picture with Shift on a corner, but not of a shape', async () => {
    const book = drawnBook([PICTURE, SHAPE]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.dragHandle('bottom-end', { x: 30, y: 0, shift: true });

    expect(anchorsOf(book)[0]).toMatchObject({ width: 120, height: 40 });

    await sheet.clickDrawing(1);
    await sheet.dragHandle('bottom-end', { x: 30, y: 0, shift: true });

    expect(anchorsOf(book)[1]).toMatchObject({ width: 94, height: 40 });
  });

  it('keeps the ratio from the start corner too', async () => {
    const book = drawnBook([PICTURE]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.dragHandle('top-start', { x: -30, y: 0, shift: true });

    expect(anchorsOf(book)[0]).toMatchObject({ width: 120, height: 40 });
  });

  it('builds a chart from the region of the cell and selects it, undo takes it away', async () => {
    const book = drawnBook([]);
    const sheet = sheetOf(book);

    await sheet.insertChart(2, 1, 'Bar');

    expect([sheet.drawings.length, sheet.selectedDrawings, sheet.announcement]).toEqual([
      1,
      [0],
      'Chart 1 selected. Arrows move it, Delete removes it, Tab goes to the next object, Escape returns to the cells',
    ]);

    expect(sheet.chartBars(0)).toBe(3);

    await sheet.press('z', { ctrl: true });

    expect(sheet.drawings).toEqual([]);
  });

  it('places a new chart at the column shown in the view', async () => {
    const book = drawnBook([]);
    const sheet = sheetOf(book);

    await sheet.insertChartOver({ row: 2, col: 1 }, 0, 'Bar');

    expect(anchorsOf(book)[0]).toMatchObject({ from: { col: 1 } });
  });

  it('starts a new chart after a column half hidden under the row headers', async () => {
    const book = drawnBook([]);
    const sheet = sheetOf(book);

    await sheet.insertChartOver({ row: 2, col: 1 }, 5000, 'Bar');

    expect(anchorsOf(book)[0]).toMatchObject({ from: { col: 2 } });
  });

  it('says why no chart is built from cells without numbers', async () => {
    const book = createWorkbook();

    book.addSheet('Sales').cells.set(0, 0, textValue('Item'));

    const sheet = sheetOf(book);

    await sheet.insertChart(1, 0, 'Line');

    expect([sheet.drawings, sheet.announcement]).toEqual([
      [],
      'Select cells with numbers to build a chart',
    ]);
  });

  it('inserts a picture chosen from a file, selected, undo takes it away', async () => {
    const book = drawnBook([]);
    const sheet = sheetOf(book);

    await sheet.insertPictureFile(2, 1, imageFile());

    expect([sheet.drawings.length, sheet.selectedDrawings, sheet.announcement]).toEqual([
      1,
      [0],
      'Picture 1 selected. Arrows move it, Delete removes it, Tab goes to the next object, Escape returns to the cells',
    ]);

    expect(anchorsOf(book)[0]).toMatchObject({ width: 480, height: 240 });

    await sheet.press('z', { ctrl: true });

    expect(sheet.drawings).toEqual([]);
  });

  it('inserts an image pasted from the clipboard', async () => {
    const book = drawnBook([]);
    const sheet = sheetOf(book);

    await sheet.pasteImage(imageFile());

    expect(sheet.selectedDrawings).toEqual([0]);
  });

  it('pastes cells when the clipboard holds text next to the image', async () => {
    const book = drawnBook([]);
    const sheet = sheetOf(book);

    await sheet.pasteImage(imageFile(), 'Pen');

    expect(sheet.drawings).toEqual([]);
  });

  it('says why a file of another type is not inserted', async () => {
    const book = drawnBook([]);
    const sheet = sheetOf(book);

    await sheet.pasteImage(imageFile('image/tiff'));

    expect([sheet.drawings, sheet.announcement]).toEqual([
      [],
      'This file cannot be inserted as a picture: use PNG, JPEG, GIF or BMP',
    ]);
  });

  it('says why an image that cannot be decoded is not inserted', async () => {
    const book = drawnBook([]);
    const sheet = sheetOf(book);

    vi.stubGlobal('createImageBitmap', async () => {
      throw new Error('broken image');
    });

    await sheet.pasteImage(imageFile());

    expect([sheet.drawings, sheet.announcement]).toEqual([
      [],
      'This file cannot be inserted as a picture: use PNG, JPEG, GIF or BMP',
    ]);
  });

  it('takes no picture into a read-only sheet', async () => {
    const book = drawnBook([]);
    const sheet = SpreadsheetDriver.mount({ book, label: 'Drawings', readonly: true });

    mounted.push(sheet);

    await sheet.pasteImage(imageFile());

    expect(sheet.drawings).toEqual([]);
  });

  it('opens the chart settings from the button and closes them', async () => {
    const book = drawnBook([CHART]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.openChartSettings();

    expect(sheet.chartSettingsOpen).toBe(true);

    await sheet.closeChartSettings();

    expect(sheet.chartSettingsOpen).toBe(false);
  });

  it('opens the chart settings with Enter and a double click', async () => {
    const book = drawnBook([CHART]);
    const keyboard = sheetOf(book);

    await keyboard.clickDrawing(0);
    await keyboard.press('Enter');

    expect(keyboard.chartSettingsOpen).toBe(true);

    const pointerSheet = sheetOf(drawnBook([CHART]));

    await pointerSheet.doubleClickDrawing(0);

    expect(pointerSheet.chartSettingsOpen).toBe(true);
  });

  it('opens no settings for a picture', async () => {
    const book = drawnBook([PICTURE]);
    const sheet = sheetOf(book);

    await sheet.doubleClickDrawing(0);

    expect(sheet.chartSettingsOpen).toBe(false);
  });

  it('changes the chart type and undo brings it back', async () => {
    const book = drawnBook([CHART]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.openChartSettings();
    await sheet.chooseChartOption(0, 'Pie');

    expect(chartInBook(book).kind).toBe(SheetChartKind.Pie);

    await sheet.closeChartSettings();
    await sheet.press('z', { ctrl: true });

    expect(chartInBook(book).kind).toBe(SheetChartKind.Column);
  });

  it('sets the title when the field is committed and removes an empty one', async () => {
    const book = drawnBook([CHART]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.openChartSettings();
    await sheet.setChartTitle('Revenue');

    expect(sheet.chartTitle).toBe('Revenue');

    await sheet.setChartTitle('  ');

    expect(chartInBook(book).title).toBeUndefined();
  });

  it('turns the legend of a chart with several series off and on', async () => {
    const book = drawnBook([TWO_SERIES]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.openChartSettings();

    expect(sheet.chartLegendShown).toBe(true);

    await sheet.setChartSwitch(0, false);

    expect(sheet.chartLegendShown).toBe(false);
  });

  it('offers stacking to columns and connecting gaps to lines only', async () => {
    const book = drawnBook([CHART]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.openChartSettings();

    expect(sheet.chartSettingsControls).toEqual([2, 0]);

    await sheet.chooseChartOption(1, 'Stacked to 100%');

    expect(chartInBook(book).stacking).toBe(SheetChartStacking.Percent);

    await sheet.chooseChartOption(0, 'Line');

    expect(sheet.chartSettingsControls).toEqual([2, 1]);

    await sheet.setChartSwitch(0, true);

    expect(chartInBook(book).gaps).toBe(SheetChartGaps.Connect);

    await sheet.chooseChartOption(0, 'Pie');

    expect(sheet.chartSettingsControls).toEqual([1, 1]);
  });

  it('keeps the chart in place while keys and clicks land in the settings', async () => {
    const book = drawnBook([CHART]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.openChartSettings();
    await sheet.pressInChartSettings('Delete');
    await sheet.pressChartSettings();

    expect([sheet.drawings.length, sheet.selectedDrawings]).toEqual([1, [0]]);
  });

  it('closes the settings when the chart goes away', async () => {
    const book = drawnBook([]);
    const sheet = sheetOf(book);

    await sheet.insertChart(2, 1, 'Bar');
    await sheet.press('Enter');

    expect(sheet.chartSettingsOpen).toBe(true);

    await sheet.focus(1, 0);
    await sheet.press('z', { ctrl: true });

    expect(sheet.chartSettingsOpen).toBe(false);
  });

  it('deletes the selected drawing and brings it back on undo', async () => {
    const book = drawnBook([PICTURE, SHAPE]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(1);
    await sheet.press('Delete');

    expect([anchorsOf(book).length, sheet.selectedDrawings, sheet.announcement]).toEqual([
      1,
      [],
      'Arrow removed',
    ]);

    await sheet.press('z', { ctrl: true });

    expect(anchorsOf(book)).toEqual([PICTURE.anchor, SHAPE.anchor]);
  });

  it('opens a menu of its own on a right click and deletes the drawing from it', async () => {
    const book = drawnBook([PICTURE, SHAPE]);
    const sheet = sheetOf(book);

    const left = await sheet.openDrawingMenu(1);

    expect([left, sheet.selectedDrawings, sheet.drawingMenuItems, sheet.cellMenuItems]).toEqual([
      false,
      [1],
      ['Delete'],
      [],
    ]);

    await sheet.chooseDrawingMenuItem('Delete');

    expect([anchorsOf(book), sheet.announcement]).toEqual([[PICTURE.anchor], 'Arrow removed']);

    await sheet.press('z', { ctrl: true });

    expect(anchorsOf(book)).toEqual([PICTURE.anchor, SHAPE.anchor]);
  });

  it('offers the settings of a chart in its menu', async () => {
    const sheet = sheetOf(drawnBook([CHART]));

    await sheet.openDrawingMenu(0);

    expect(sheet.drawingMenuItems).toEqual(['Chart settings', 'Delete']);

    await sheet.chooseDrawingMenuItem('Chart settings');

    expect(sheet.chartSettingsOpen).toBe(true);
  });

  it('opens the menu of a selected drawing with Shift+F10 instead of the cell menu', async () => {
    const sheet = sheetOf(drawnBook([PICTURE]));

    await sheet.clickDrawing(0);
    await sheet.press('F10', { shift: true });

    expect([sheet.drawingMenuItems, sheet.drawingMenuFocused, sheet.cellMenuItems]).toEqual([
      ['Delete'],
      true,
      [],
    ]);
  });

  it('opens the menu of a selected drawing with the menu key', async () => {
    const sheet = sheetOf(drawnBook([CHART]));

    await sheet.clickDrawing(0);
    await sheet.press('ContextMenu');

    expect([sheet.drawingMenuItems, sheet.drawingMenuFocused, sheet.cellMenuItems]).toEqual([
      ['Chart settings', 'Delete'],
      true,
      [],
    ]);
  });

  it('opens the menu of a drawing held by a finger', async () => {
    const sheet = sheetOf(drawnBook([PICTURE]));

    await sheet.settle();
    vi.useFakeTimers();
    await sheet.holdDrawing(0, 600);

    expect([sheet.selectedDrawings, sheet.drawingMenuItems]).toEqual([[0], ['Delete']]);
  });

  it('leaves a right click on a drawing of a read-only sheet to the browser', async () => {
    const sheet = SpreadsheetDriver.mount({
      book: drawnBook([PICTURE]),
      label: 'Drawings',
      readonly: true,
    });

    mounted.push(sheet);

    expect([await sheet.openDrawingMenu(0), sheet.drawingMenuItems]).toEqual([true, []]);
  });

  it('gives the arrows back to the cells after Escape', async () => {
    const book = drawnBook([PICTURE]);
    const sheet = sheetOf(book);

    await sheet.clickDrawing(0);
    await sheet.press('Escape');
    await sheet.press('ArrowRight');

    expect([sheet.selectedDrawings, anchorsOf(book)]).toEqual([[], [PICTURE.anchor]]);
  });

  it('reaches drawings from the cells with Alt+F10 and walks them with Tab', async () => {
    const sheet = sheetOf(drawnBook([PICTURE, SHAPE]));

    await sheet.focus(1, 0);
    await sheet.press('F10', { alt: true });

    expect(sheet.selectedDrawings).toEqual([0]);

    await sheet.press('Tab');

    expect(sheet.selectedDrawings).toEqual([1]);

    await sheet.press('Tab');

    expect(sheet.selectedDrawings).toEqual([0]);

    await sheet.press('Tab', { shift: true });

    expect(sheet.selectedDrawings).toEqual([1]);
  });

  it('drops the selection when a cell is pressed', async () => {
    const sheet = sheetOf(drawnBook([PICTURE]));

    await sheet.clickDrawing(0);
    await sheet.pressCell(1, 0);

    expect(sheet.selectedDrawings).toEqual([]);
  });

  it('does not select drawings on a read-only sheet', async () => {
    const book = drawnBook([PICTURE]);
    const driver = SpreadsheetDriver.mount({ book, label: 'Drawings', readonly: true });

    mounted.push(driver);

    await driver.clickDrawing(0);
    await driver.press('Delete');

    expect([driver.selectedDrawings, anchorsOf(book)]).toEqual([[], [PICTURE.anchor]]);
  });
});
