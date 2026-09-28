import type { Locator, Page } from '@playwright/test';
import { boxOf, type Box } from '../helpers/geometry';

export interface GridCell {
  readonly row: number;
  readonly col: number;
}

export interface GridScroll {
  readonly top?: number;
  readonly left?: number;
}

export class GridSection {
  readonly root: Locator;
  readonly viewport: Locator;
  readonly emptyToggle: Locator;
  readonly empty: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('grid');
    this.viewport = this.root.locator('.nui-grid__viewport');
    this.emptyToggle = page.getByTestId('grid-empty');
    this.empty = this.root.locator('.nui-grid__empty');
  }

  row(position: number): Locator {
    return this.viewport.locator(`[role="row"][aria-rowindex="${position + 2}"]`);
  }

  header(col: number): Locator {
    return this.viewport.locator(`[role="columnheader"][aria-colindex="${col + 1}"]`);
  }

  cell(position: number, col: number): Locator {
    return this.row(position).locator(`[aria-colindex="${col + 1}"]`);
  }

  async scrollTo(target: GridScroll): Promise<void> {
    await this.viewport.evaluate((element, position) => {
      element.scrollTo(position);
    }, target);
  }

  async scrollToBottom(): Promise<void> {
    await this.viewport.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
  }

  sortOrder(col: number): Locator {
    return this.header(col).locator('.nui-grid__sort-order');
  }

  async numbersIn(col: number, count: number): Promise<number[]> {
    const texts = await Promise.all(
      Array.from({ length: count }, (_, row) => this.cell(row, col).innerText()),
    );

    return texts.map((text) => Number(text.replaceAll(/\D/g, '')));
  }

  renderedRowCount(): Promise<number> {
    return this.viewport.evaluate(
      (element) => element.querySelectorAll('.nui-grid__body > [role="row"]').length,
    );
  }

  scrollTop(): Promise<number> {
    return this.viewport.evaluate((element) => element.scrollTop);
  }

  focusedCell(): Promise<GridCell | null> {
    return this.page.evaluate(() => {
      const cell = document.activeElement;

      if (cell === null || !cell.matches('.nui-grid__cell')) {
        return null;
      }
      const row = cell.closest('[role="row"]');

      return {
        row: Number(row?.getAttribute('aria-rowindex')) - 2,
        col: Number(cell.getAttribute('aria-colindex')) - 1,
      };
    });
  }

  viewportBox(): Promise<Box> {
    return boxOf(this.viewport);
  }

  cellBox(position: number, col: number): Promise<Box> {
    return boxOf(this.cell(position, col));
  }

  async headerBottom(): Promise<number> {
    const header = await boxOf(this.viewport.locator('.nui-grid__header'));
    return header.y + header.height;
  }

  clientRight(): Promise<number> {
    return this.viewport.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.left + element.clientLeft + element.clientWidth;
    });
  }

  clientLeft(): Promise<number> {
    return this.viewport.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.right - element.clientLeft - element.clientWidth;
    });
  }
}
