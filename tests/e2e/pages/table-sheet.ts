import type { Locator, Page } from '@playwright/test';

export interface TableSheetEdge {
  readonly width: string;
  readonly style: string;
}

const HEAD_ROWS = 1;
const BODY_ROWS = ':scope > .nui-table__body > [role="row"]';

export class TableSheetSection {
  readonly toggle: Locator;
  readonly root: Locator;
  readonly viewport: Locator;
  readonly grid: Locator;
  readonly borderedSwitch: Locator;
  readonly heatSwitch: Locator;
  readonly windowSwitch: Locator;
  readonly quarterSwitch: Locator;

  constructor(page: Page) {
    this.toggle = page.getByTestId('table-sheet-toggle');
    this.root = page.getByTestId('table-sheet');
    this.viewport = this.root.locator(':scope > .nui-table__frame > .nui-table__viewport');
    this.grid = this.viewport.locator(':scope > .nui-table__grid');
    this.borderedSwitch = page.getByTestId('table-sheet-bordered');
    this.heatSwitch = page.getByTestId('table-sheet-heat');
    this.windowSwitch = page.getByTestId('table-sheet-window');
    this.quarterSwitch = page.getByTestId('table-sheet-quarter');
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
    return this.row(position).locator(`:scope > [aria-colindex="${col + 1}"]`);
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

  rowHeights(): Promise<number[]> {
    return this.grid.evaluate(
      (grid, selector) => [
        ...new Set(
          [...grid.querySelectorAll(selector)].map((row) => row.getBoundingClientRect().height),
        ),
      ],
      BODY_ROWS,
    );
  }

  hasSpareRoom(): Promise<boolean> {
    return this.viewport.evaluate((element) => element.scrollWidth <= element.clientWidth);
  }
}
