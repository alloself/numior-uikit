import type { Locator, Page } from '@playwright/test';
import { paintedColumn, rgbDelta, tokenRgbIn } from '../helpers/color';
import { boxOf, type Box } from '../helpers/geometry';
import { TableCellsSection } from './table-cells';

export interface TableFlowPiece {
  readonly cell: Box;
  readonly piece: Box;
  readonly line: string;
  readonly clip: string;
  readonly hidden: boolean;
  readonly overflows: boolean;
  readonly text: string;
}

const RING_MATCH = 40;
const RING_REACH = 3;
const RING_STEPS = [-1, 0, 1];

export class TableFlowSection extends TableCellsSection {
  readonly frozen: Locator;
  readonly pinned: Locator;

  constructor(page: Page) {
    super(page, 'table-flow');
    this.frozen = page.getByTestId('table-flow-frozen');
    this.pinned = page.getByTestId('table-flow-pinned');
  }

  piece(position: number, col: number): Locator {
    return this.cell(position, col).locator(
      ':scope > .nui-table__content > :is(.nui-table__spill, .nui-table__text)',
    );
  }

  async pieceOf(position: number, col: number): Promise<TableFlowPiece> {
    const piece = this.piece(position, col);

    const [cell, box, facts] = await Promise.all([
      boxOf(this.cell(position, col)),
      boxOf(piece),
      piece.evaluate((element) => ({
        line: getComputedStyle(element.closest('td, th') ?? element).borderInlineEndWidth,
        clip: getComputedStyle(element).textOverflow,
        hidden: element.getAttribute('aria-hidden') === 'true',
        overflows: element.scrollWidth > element.clientWidth,
        text: element.textContent ?? '',
      })),
    ]);

    return { cell, piece: box, ...facts };
  }

  async piecesOf(position: number, from: number, to: number): Promise<TableFlowPiece[]> {
    return Promise.all(
      Array.from({ length: to - from + 1 }, (_, index) => this.pieceOf(position, from + index)),
    );
  }

  spills(position: number): Promise<number[]> {
    return this.row(position).evaluate((row) =>
      [...row.querySelectorAll(':scope > .nui-table__cell--spill')].map(
        (cell) => Number(cell.getAttribute('aria-colindex')) - 2,
      ),
    );
  }

  rangedCount(): Promise<number> {
    return this.grid.locator(':scope > .nui-table__body .nui-table__cell--ranged').count();
  }

  async scrollTo(left: number, top = 0): Promise<void> {
    await this.viewport.evaluate(
      (viewport, [x, y]) => {
        viewport.scrollTo({ left: x, top: y, behavior: 'instant' });
      },
      [left, top] as const,
    );
  }

  async press(position: number, col: number): Promise<void> {
    await this.root.scrollIntoViewIfNeeded();

    const box = await boxOf(this.cell(position, col));

    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }

  async scrollToColumn(col: number): Promise<void> {
    await this.viewport.evaluate((viewport, index) => {
      const header = viewport.querySelector(
        '.nui-table__header [role="columnheader"]:not([aria-colindex="1"])',
      );

      const width = header?.getBoundingClientRect().width ?? 0;
      const sign = getComputedStyle(viewport).direction === 'rtl' ? -1 : 1;

      viewport.scrollTo({ left: sign * width * index, behavior: 'instant' });
    }, col);
  }

  scrollTop(): Promise<number> {
    return this.viewport.evaluate((viewport) => viewport.scrollTop);
  }

  scrollLeft(): Promise<number> {
    return this.viewport.evaluate((viewport) => viewport.scrollLeft);
  }

  async ringShare(position: number, col: number): Promise<number> {
    await this.page.mouse.move(0, 0);

    const [cell, root, primary] = await Promise.all([
      boxOf(this.cell(position, col)),
      boxOf(this.root),
      tokenRgbIn(this.root, '--nui-focus'),
    ]);

    const middle = cell.y - root.y + cell.height / 2;

    const columns = await Promise.all(
      RING_STEPS.map((step) =>
        paintedColumn(
          this.root,
          cell.x - root.x + 0.5 + step,
          middle - RING_REACH,
          middle + RING_REACH,
        ),
      ),
    );

    return columns.reduce((best, column) => {
      const ring = column.pixels.reduce(
        (count, pixel) => count + (rgbDelta(pixel, primary) < RING_MATCH ? 1 : 0),
        0,
      );

      return Math.max(best, ring / column.pixels.length);
    }, 0);
  }
}
