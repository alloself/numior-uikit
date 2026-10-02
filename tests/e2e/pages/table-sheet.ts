import type { Locator, Page } from '@playwright/test';
import { paintedRgbAt, type Point, type Rgb } from '../helpers/color';
import { boxOf } from '../helpers/geometry';
import {
  isNumber,
  listOf,
  parseAs,
  recordOf,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';

const isCorner = shapeOf({ row: isNumber, col: isNumber });

const isSheetOutput = shapeOf({
  ranges: listOf(shapeOf({ from: isCorner, to: isCorner })),
  rowHeights: recordOf(isNumber),
});

export type TableSheetOutput = Guarded<typeof isSheetOutput>;

export interface TableSheetEdge {
  readonly width: string;
  readonly style: string;
}

export interface TableSheetBand {
  readonly top: number;
  readonly bottom: number;
}

export interface TableSheetWindow {
  readonly frozenBottom: number;
  readonly firstTop: number;
  readonly lastBottom: number;
  readonly end: number;
}

const HEAD_ROWS = 1;
const ROW_HEADERS = 1;
const BODY_ROWS = ':scope > .nui-table__body > [role="row"]';
const LEAK = 12;
const HEADER_TOP: readonly number[] = [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3, 3.3, 3.6];

const HEADER_POINTS: readonly Point[] = HEADER_TOP.flatMap((y): Point[] => [
  [30, y],
  [140, y],
]);

const LAYER_PAINT = `
  html, body { overflow-anchor: none; }
  [data-testid='table-sheet'] .nui-table__body .nui-table__cell {
    background-color: blue !important;
    background-image: none !important;
  }
`;

const BAND_PAINT = `
  html, body { overflow-anchor: none; }
  [data-testid='table-sheet'] .nui-table__body > .nui-table__row:not(.nui-table__row--frozen) > .nui-table__cell {
    background-color: blue !important;
    background-image: none !important;
    color: blue !important;
  }
`;

const BAND_TOP = 31.5;
const BAND_BOTTOM = 107;
const BAND_STEP = 0.5;
const BAND_COLUMNS: readonly number[] = [60, 150, 420];
const HIT_COLUMN = 120;

const BAND_POINTS: readonly Point[] = Array.from(
  { length: Math.floor((BAND_BOTTOM - BAND_TOP) / BAND_STEP) + 1 },
  (_, step) => BAND_TOP + step * BAND_STEP,
).flatMap((y) => BAND_COLUMNS.map((x): Point => [x, y]));

const showsBody = ([red, green, blue]: Rgb): boolean => blue - Math.max(red, green) > LEAK;

export class TableSheetSection {
  readonly scope = '[data-testid="table-sheet"]';
  readonly toggle: Locator;
  readonly root: Locator;
  readonly viewport: Locator;
  readonly grid: Locator;
  readonly borderedSwitch: Locator;
  readonly heatSwitch: Locator;
  readonly windowSwitch: Locator;
  readonly quarterSwitch: Locator;
  readonly longSwitch: Locator;
  readonly frozenSwitch: Locator;
  readonly journalNote: Locator;
  readonly corner: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.toggle = page.getByTestId('table-sheet-toggle');
    this.root = page.getByTestId('table-sheet');
    this.viewport = this.root.locator(':scope > .nui-table__frame > .nui-table__viewport');
    this.grid = this.viewport.locator(':scope > .nui-table__grid');
    this.borderedSwitch = page.getByTestId('table-sheet-bordered');
    this.heatSwitch = page.getByTestId('table-sheet-heat');
    this.windowSwitch = page.getByTestId('table-sheet-window');
    this.quarterSwitch = page.getByTestId('table-sheet-quarter');
    this.longSwitch = page.getByTestId('table-sheet-long');
    this.frozenSwitch = page.getByTestId('table-sheet-frozen');
    this.journalNote = this.grid.locator('.nui-table__cell--tall', { hasText: 'Операции сверены' });
    this.corner = this.grid.locator(':scope > .nui-table__header [aria-colindex="1"]');
    this.output = page.getByTestId('table-sheet-output');
  }

  async show(): Promise<void> {
    await this.toggle.scrollIntoViewIfNeeded();
    await this.toggle.click();
    await this.root.scrollIntoViewIfNeeded();
  }

  row(position: number): Locator {
    return this.grid.locator(`${BODY_ROWS}[aria-rowindex="${position + HEAD_ROWS + 1}"]`);
  }

  cell(position: number, col: number): Locator {
    return this.row(position).locator(`:scope > [aria-colindex="${col + ROW_HEADERS + 1}"]`);
  }

  text(position: number, col: number): Locator {
    return this.cell(position, col).locator('.nui-table__text');
  }

  inkOf(position: number, col: number): Promise<{ left: number; right: number }> {
    return this.text(position, col).evaluate((element) => {
      const range = document.createRange();

      range.selectNodeContents(element);
      const { left, right } = range.getBoundingClientRect();

      return { left, right };
    });
  }

  content(cell: Locator): Locator {
    return cell.locator(':scope > .nui-table__content');
  }

  async canvasTop(target: Locator): Promise<number> {
    const [box, frame, scrolled] = await Promise.all([
      boxOf(target),
      boxOf(this.viewport),
      this.viewport.evaluate((element) => element.scrollTop),
    ]);

    return Math.round(box.y - frame.y + scrolled);
  }

  async middleGap(position: number, col: number): Promise<number> {
    const [cell, text] = await Promise.all([
      boxOf(this.cell(position, col)),
      boxOf(this.text(position, col)),
    ]);

    return Math.abs(text.y + text.height / 2 - (cell.y + cell.height / 2));
  }

  rowHeader(position: number): Locator {
    return this.row(position).locator(':scope > [role="rowheader"]');
  }

  columnHeader(col: number): Locator {
    return this.grid.locator(
      `:scope > .nui-table__header [role="columnheader"][aria-colindex="${col + ROW_HEADERS + 1}"]`,
    );
  }

  rowResizer(position: number): Locator {
    return this.rowHeader(position).locator('.nui-table__resizer');
  }

  private async readOutput(): Promise<TableSheetOutput> {
    return parseAs(await this.output.innerText(), isSheetOutput, 'table sheet output');
  }

  async ranges(): Promise<TableSheetOutput['ranges']> {
    return (await this.readOutput()).ranges;
  }

  async rowHeights(): Promise<TableSheetOutput['rowHeights']> {
    return (await this.readOutput()).rowHeights;
  }

  scrollHeight(): Promise<number> {
    return this.viewport.evaluate((element) => element.scrollHeight);
  }

  lineAfter(position: number, col: number): Promise<string> {
    return this.cell(position, col).evaluate(
      (element) => getComputedStyle(element).borderInlineEndWidth,
    );
  }

  topEdge(position: number, col: number): Promise<TableSheetEdge | null> {
    return this.cell(position, col).evaluate((element) => {
      const style = getComputedStyle(element, '::before');

      return style.content === 'none'
        ? null
        : { width: style.borderTopWidth, style: style.borderTopStyle };
    });
  }

  tokenColor(token: string): Promise<string> {
    return this.root.evaluate((element, name) => {
      const probe = document.createElement('span');

      probe.style.color = `var(${name})`;
      element.append(probe);
      const color = getComputedStyle(probe).color;

      probe.remove();
      return color;
    }, token);
  }

  fillLayers(position: number, col: number): Promise<number> {
    return this.cell(position, col).evaluate(
      (element) => getComputedStyle(element).backgroundImage.split('gradient(').length - 1,
    );
  }

  boxHeights(): Promise<number[]> {
    return this.grid.evaluate(
      (grid, selector) => [
        ...new Set(
          [...grid.querySelectorAll(selector)].map((row) => row.getBoundingClientRect().height),
        ),
      ],
      BODY_ROWS,
    );
  }

  async scrollTo(top: number, left: number): Promise<void> {
    await this.viewport.evaluate(
      (element, [y, x]) => {
        const sign = getComputedStyle(element).direction === 'rtl' ? -1 : 1;

        element.scrollTop = y ?? 0;
        element.scrollLeft = sign * (x ?? 0);
      },
      [top, left],
    );
  }

  async paintLayers(): Promise<void> {
    await this.page.addStyleTag({ content: LAYER_PAINT });
  }

  async paintScrolledRows(): Promise<void> {
    await this.page.addStyleTag({ content: BAND_PAINT });
  }

  private painted(): Promise<void> {
    return this.viewport.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );
  }

  private async shiftTo(fraction: number): Promise<void> {
    await this.root.evaluate((element, target) => {
      element.style.setProperty('inset-block-start', '0px');

      const edge = element.getBoundingClientRect().top * devicePixelRatio;
      const shift = (((target - (edge % 1)) % 1) + 1) % 1;

      element.style.setProperty('inset-block-start', `${shift / devicePixelRatio}px`);
    }, fraction);
  }

  async headerLeaks(fraction: number): Promise<Rgb[]> {
    await this.shiftTo(fraction);
    await this.scrollTo(96, 300);
    await this.painted();

    return (await paintedRgbAt(this.root, HEADER_POINTS)).filter(showsBody);
  }

  async bandLeaks(fraction: number, top: number): Promise<Rgb[]> {
    await this.shiftTo(fraction);
    await this.scrollTo(top, 0);
    await this.painted();

    return (await paintedRgbAt(this.root, BAND_POINTS)).filter(showsBody);
  }

  scrollTop(): Promise<number> {
    return this.viewport.evaluate((element) => element.scrollTop);
  }

  async bandOf(target: Locator): Promise<TableSheetBand> {
    const [box, frame] = await Promise.all([boxOf(target), boxOf(this.viewport)]);

    return {
      top: Math.round(box.y - frame.y),
      bottom: Math.round(box.y + box.height - frame.y),
    };
  }

  rowAt(offset: number): Promise<number | null> {
    return this.viewport.evaluate(
      (element, { y, x, head }) => {
        element.scrollIntoView({ block: 'center' });

        const box = element.getBoundingClientRect();
        const rtl = getComputedStyle(element).direction === 'rtl';
        const point = rtl ? box.right - x : box.left + x;
        const row = document.elementFromPoint(point, box.top + y)?.closest('[role="row"]');
        const index = Number(row?.getAttribute('aria-rowindex'));

        return Number.isInteger(index) && index > head ? index - head - 1 : null;
      },
      { y: offset, x: HIT_COLUMN, head: HEAD_ROWS },
    );
  }

  async focusNatively(target: Locator): Promise<void> {
    await target.evaluate((element) => {
      if (element instanceof HTMLElement) {
        element.focus();
      }
    });

    await this.painted();
  }

  runAhead(top: number): Promise<TableSheetWindow> {
    return this.viewport.evaluate(
      (element, { target, rows }) => {
        const base = element.getBoundingClientRect().top;
        const grid = element.querySelector(':scope > .nui-table__grid');
        const all = [...(grid?.querySelectorAll(rows) ?? [])];
        const frozen = all.filter((row) => row.classList.contains('nui-table__row--frozen'));
        const moving = all.filter((row) => !row.classList.contains('nui-table__row--frozen'));

        const edgeOf = (row: Element | undefined, side: 'top' | 'bottom'): number =>
          Math.round((row?.firstElementChild?.getBoundingClientRect()[side] ?? 0) - base);

        element.scrollTop = target;

        return {
          frozenBottom: edgeOf(frozen.at(-1), 'bottom'),
          firstTop: edgeOf(moving[0], 'top'),
          lastBottom: edgeOf(moving.at(-1), 'bottom'),
          end: element.clientHeight,
        };
      },
      { target: top, rows: BODY_ROWS },
    );
  }

  hasSpareRoom(): Promise<boolean> {
    return this.viewport.evaluate((element) => element.scrollWidth <= element.clientWidth);
  }
}
