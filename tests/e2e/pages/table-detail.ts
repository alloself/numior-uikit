import type { Locator, Page } from '@playwright/test';
import {
  isNumber,
  listOf,
  nullable,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';
import { sectionScope } from '../helpers/axe';

export type TableDetailOutput = Guarded<typeof isDetailOutput>;

export interface TableDetailTopRow {
  readonly text: string;
  readonly gap: number;
}

export interface TableDetailEdges {
  readonly top: number;
  readonly bottom: number;
}

const isDetailOutput = shapeOf({
  expanded: listOf(isNumber),
  opened: nullable(isNumber),
  lastClick: nullable(isNumber),
});

const HEAD_ROWS = 1;
const BODY_ROWS = ':scope > .nui-table__body > [role="row"]';

export class TableDetailSection {
  readonly scope = sectionScope('table-detail');

  readonly root: Locator;
  readonly viewport: Locator;
  readonly grid: Locator;
  readonly windowSwitch: Locator;
  readonly fluidSwitch: Locator;
  readonly stripedSwitch: Locator;
  readonly openFirst: Locator;
  readonly closeAll: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('table-detail');
    this.viewport = this.root.locator(':scope > .nui-table__frame > .nui-table__viewport');
    this.grid = this.viewport.locator(':scope > .nui-table__grid');
    this.windowSwitch = page.getByTestId('table-detail-window');
    this.fluidSwitch = page.getByTestId('table-detail-fluid');
    this.stripedSwitch = page.getByTestId('table-detail-striped');
    this.openFirst = page.getByTestId('table-detail-open');
    this.closeAll = page.getByTestId('table-detail-close');
    this.output = page.getByTestId('table-detail-output');
  }

  row(position: number): Locator {
    return this.grid.locator(`${BODY_ROWS}[aria-rowindex="${position + HEAD_ROWS + 1}"]`);
  }

  cell(position: number, col: number): Locator {
    return this.row(position).locator(`:scope > [aria-colindex="${col + 1}"]`);
  }

  toggle(position: number): Locator {
    return this.cell(position, 0).locator('.nui-table__toggle--expandable');
  }

  panel(id: number): Locator {
    return this.page.getByTestId(`table-detail-${id}`);
  }

  nestedGrid(id: number): Locator {
    return this.panel(id).locator('.nui-table__grid');
  }

  nestedCell(id: number, position: number, col: number): Locator {
    return this.nestedGrid(id).locator(
      `${BODY_ROWS}[aria-rowindex="${position + HEAD_ROWS + 1}"] > [aria-colindex="${col + 1}"]`,
    );
  }

  openButton(id: number): Locator {
    return this.panel(id).getByRole('button', { name: 'Открыть поставку' });
  }

  async readOutput(): Promise<TableDetailOutput> {
    return parseAs(await this.output.innerText(), isDetailOutput, 'table detail output');
  }

  scrollHeight(): Promise<number> {
    return this.viewport.evaluate((element) => element.scrollHeight);
  }

  async scrollTo(top: number): Promise<void> {
    await this.viewport.evaluate((element, value) => {
      element.scrollTop = value;
    }, top);
  }

  async scrollAcross(): Promise<void> {
    await this.viewport.evaluate((element) => {
      const sign = getComputedStyle(element).direction === 'rtl' ? -1 : 1;

      element.scrollLeft = sign * element.scrollWidth;
    });
  }

  scrolledAcross(): Promise<boolean> {
    return this.viewport.evaluate(
      (element) =>
        Math.abs(element.scrollLeft) >= element.scrollWidth - element.clientWidth - 1 &&
        element.scrollWidth > element.clientWidth,
    );
  }

  async scrollToEnd(): Promise<void> {
    await this.viewport.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
  }

  scrollPastColumns(): Promise<number> {
    return this.viewport.evaluate((element) => {
      const grid = element.querySelector('.nui-table__grid');
      const columns = grid?.getBoundingClientRect().width ?? 0;

      return Math.round(element.scrollWidth - Math.max(columns, element.clientWidth));
    });
  }

  largestRowGap(): Promise<number> {
    return this.grid.evaluate((grid, selector) => {
      const rects = [...grid.querySelectorAll(selector)].map((row) => row.getBoundingClientRect());

      return rects.reduce(
        (gap, rect, index) =>
          index === 0 ? gap : Math.max(gap, Math.abs(rect.top - (rects[index - 1]?.bottom ?? 0))),
        0,
      );
    }, BODY_ROWS);
  }

  bodyEdges(): Promise<TableDetailEdges> {
    return this.viewport.evaluate((viewport) => {
      const header = viewport.querySelector(
        ':scope > .nui-table__grid > .nui-table__header [role="columnheader"]',
      );

      return {
        top: header?.getBoundingClientRect().bottom ?? 0,
        bottom: viewport.getBoundingClientRect().top + viewport.clientTop + viewport.clientHeight,
      };
    });
  }

  topRow(): Promise<TableDetailTopRow | null> {
    return this.grid.evaluate((grid, selector) => {
      const header = grid.querySelector(':scope > .nui-table__header [role="columnheader"]');
      const edge = header?.getBoundingClientRect().bottom ?? 0;

      const row = [...grid.querySelectorAll(selector)].find(
        (candidate) => candidate.getBoundingClientRect().bottom > edge + 1,
      );

      return row === undefined
        ? null
        : {
            text: row.firstElementChild?.textContent?.trim() ?? '',
            gap: row.getBoundingClientRect().top - edge,
          };
    }, BODY_ROWS);
  }
}
