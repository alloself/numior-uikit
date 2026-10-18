import type { Locator, Page } from '@playwright/test';
import { boxOf, spanBox, type Box } from '../helpers/geometry';
import {
  isNumber,
  listOf,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';

const isCorner = shapeOf({ row: isNumber, col: isNumber });

const isCellsOutput = shapeOf({
  ranges: listOf(shapeOf({ from: isCorner, to: isCorner })),
});

export type TableCellsOutput = Guarded<typeof isCellsOutput>;

export interface TableCellsSpot {
  readonly row: string;
  readonly col: string;
}

const HEAD_ROWS = 1;
const ROW_HEADERS = 1;

export class TableCellsSection {
  readonly scope: string;
  readonly toggle: Locator;
  readonly root: Locator;
  readonly viewport: Locator;
  readonly grid: Locator;
  readonly output: Locator;
  readonly nameBox: Locator;
  readonly formula: Locator;
  readonly references: Locator;
  readonly recalc: Locator;

  constructor(
    protected readonly page: Page,
    id = 'table-cells',
  ) {
    this.scope = `[data-testid="${id}"]`;
    this.toggle = page.getByTestId(`${id}-toggle`);
    this.root = page.getByTestId(id);
    this.viewport = this.root.locator(':scope > .nui-table__frame > .nui-table__viewport');
    this.grid = this.viewport.locator(':scope > .nui-table__grid');
    this.output = page.getByTestId(`${id}-output`);
    this.nameBox = page.getByTestId(`${id}-name`);
    this.formula = page.getByTestId(`${id}-formula`);
    this.references = this.grid.locator(':scope > .nui-table__overlay .sheet-ref');
    this.recalc = page.getByTestId(`${id}-recalc`);
  }

  async show(): Promise<void> {
    await this.toggle.scrollIntoViewIfNeeded();
    await this.toggle.click();
    await this.root.scrollIntoViewIfNeeded();
  }

  private row(position: number): Locator {
    return this.grid.locator(
      `:scope > .nui-table__body > [role="row"][aria-rowindex="${position + HEAD_ROWS + 1}"]`,
    );
  }

  cell(position: number, col: number): Locator {
    return this.row(position).locator(`:scope > [aria-colindex="${col + ROW_HEADERS + 1}"]`);
  }

  spanOf(from: [row: number, col: number], to: [row: number, col: number]): Promise<Box> {
    return spanBox(this.cell(...from), this.cell(...to));
  }

  async dragAcross(from: Locator, to: Locator): Promise<void> {
    const [start, end] = await Promise.all([boxOf(from), boxOf(to)]);

    await this.page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 5 });
    await this.page.mouse.up();
  }

  async paste(text: string): Promise<void> {
    await this.page.evaluate((pasted) => {
      const data = new DataTransfer();
      const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });

      data.setData('text/plain', pasted);
      Object.defineProperty(event, 'clipboardData', { value: data });
      document.activeElement?.dispatchEvent(event);
    }, text);
  }

  text(position: number, col: number): Locator {
    return this.cell(position, col).locator('.nui-table__text');
  }

  lineAfter(position: number, col: number): Promise<string> {
    return this.cell(position, col).evaluate(
      (element) => getComputedStyle(element).borderInlineEndWidth,
    );
  }

  inkOf(position: number, col: number): Promise<{ left: number; right: number }> {
    return this.text(position, col).evaluate((element) => {
      const range = document.createRange();

      range.selectNodeContents(element);
      const { left, right } = range.getBoundingClientRect();

      return { left, right };
    });
  }

  editor(position: number, col: number): Locator {
    return this.cell(position, col).locator('.nui-table__editor input');
  }

  rowHeader(position: number): Locator {
    return this.row(position).locator(':scope > [role="rowheader"]');
  }

  columnHeader(col: number): Locator {
    return this.grid.locator(
      `:scope > .nui-table__header [role="columnheader"][aria-colindex="${col + ROW_HEADERS + 1}"]`,
    );
  }

  spot(): Promise<TableCellsSpot> {
    return this.grid.evaluate((grid) => {
      const cell = document.activeElement?.closest('[aria-colindex]');
      const row = cell?.parentElement;

      const header = grid.querySelector(
        `:scope > .nui-table__header [aria-colindex="${cell?.getAttribute('aria-colindex') ?? ''}"]`,
      );

      return {
        row: row?.querySelector(':scope > [role="rowheader"]')?.textContent?.trim() ?? '',
        col: header?.textContent?.trim() ?? '',
      };
    });
  }

  async ranges(): Promise<TableCellsOutput['ranges']> {
    return parseAs(await this.output.innerText(), isCellsOutput, 'table cells output').ranges;
  }
}
