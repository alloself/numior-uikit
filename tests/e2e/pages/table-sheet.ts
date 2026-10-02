import type { Locator, Page } from '@playwright/test';
import {
  isNumber,
  listOf,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';

const isCorner = shapeOf({ row: isNumber, col: isNumber });
const isSheetOutput = shapeOf({ ranges: listOf(shapeOf({ from: isCorner, to: isCorner })) });

export type TableSheetOutput = Guarded<typeof isSheetOutput>;

export interface TableSheetEdge {
  readonly width: string;
  readonly style: string;
}

const HEAD_ROWS = 1;
const ROW_HEADERS = 1;
const BODY_ROWS = ':scope > .nui-table__body > [role="row"]';

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
  readonly corner: Locator;
  readonly output: Locator;

  constructor(page: Page) {
    this.toggle = page.getByTestId('table-sheet-toggle');
    this.root = page.getByTestId('table-sheet');
    this.viewport = this.root.locator(':scope > .nui-table__frame > .nui-table__viewport');
    this.grid = this.viewport.locator(':scope > .nui-table__grid');
    this.borderedSwitch = page.getByTestId('table-sheet-bordered');
    this.heatSwitch = page.getByTestId('table-sheet-heat');
    this.windowSwitch = page.getByTestId('table-sheet-window');
    this.quarterSwitch = page.getByTestId('table-sheet-quarter');
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

  rowHeader(position: number): Locator {
    return this.row(position).locator(':scope > [role="rowheader"]');
  }

  columnHeader(col: number): Locator {
    return this.grid.locator(
      `:scope > .nui-table__header [role="columnheader"][aria-colindex="${col + ROW_HEADERS + 1}"]`,
    );
  }

  async ranges(): Promise<TableSheetOutput['ranges']> {
    return parseAs(await this.output.innerText(), isSheetOutput, 'table sheet output').ranges;
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

  async restOnHalfPixel(): Promise<void> {
    await this.root.evaluate((element) => {
      const top = element.getBoundingClientRect().top * devicePixelRatio;
      const shift = (((0.5 - (top % 1)) % 1) + 1) % 1;

      element.style.setProperty('margin-block-start', `${shift / devicePixelRatio}px`);
    });
  }

  hasSpareRoom(): Promise<boolean> {
    return this.viewport.evaluate((element) => element.scrollWidth <= element.clientWidth);
  }
}
