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

const HEAD_ROWS = 2;

export class GridSection {
  readonly root: Locator;
  readonly viewport: Locator;
  readonly emptyToggle: Locator;
  readonly empty: Locator;
  readonly quick: Locator;
  readonly clearFilters: Locator;
  readonly output: Locator;
  readonly filter: Locator;
  readonly menu: Locator;
  readonly resetColumns: Locator;
  readonly tree: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('grid');
    this.viewport = this.root.locator('.nui-grid__viewport');
    this.emptyToggle = page.getByTestId('grid-empty');
    this.empty = this.root.locator('.nui-grid__empty');
    this.quick = page.getByTestId('grid-quick');
    this.clearFilters = page.getByTestId('grid-clear-filters');
    this.output = page.getByTestId('grid-output');
    this.filter = page.locator('.nui-grid-filter');
    this.menu = this.root.locator(':scope > .nui-menu');
    this.resetColumns = page.getByTestId('grid-reset-columns');
    this.tree = page.getByTestId('grid-tree');
  }

  menuButton(col: number): Locator {
    return this.header(col).locator('.nui-grid__menu');
  }

  async openMenu(col: number): Promise<void> {
    await this.header(col).hover();
    await this.menuButton(col).click();
  }

  headerPane(col: number): Promise<string | undefined> {
    return this.header(col).evaluate(
      (element) => /nui-grid__pane--(\w+)/.exec(element.parentElement?.className ?? '')?.[1],
    );
  }

  menuItem(label: string): Locator {
    const name = { name: label, exact: true };

    return this.menu
      .getByRole('menuitem', name)
      .or(this.menu.getByRole('menuitemradio', name))
      .or(this.menu.getByRole('menuitemcheckbox', name));
  }

  treeRow(position: number): Locator {
    return this.tree.locator(`.nui-grid__viewport [role="row"][aria-rowindex="${position + 2}"]`);
  }

  treeToggle(position: number): Locator {
    return this.treeRow(position).locator('.nui-grid__toggle--expandable');
  }

  footerCell(col: number): Locator {
    return this.root.locator(`.nui-grid__footer [aria-colindex="${col + 1}"]`);
  }

  groupLabel(position: number): Locator {
    return this.row(position).locator('.nui-grid__group');
  }

  async groupBy(label: string): Promise<void> {
    await this.page.getByTestId('grid-group').click();
    await this.page.locator('.nui-select__listbox').getByRole('option', { name: label }).click();
  }

  filterButton(col: number): Locator {
    return this.header(col).locator('.nui-grid__filter');
  }

  async openFilter(col: number): Promise<void> {
    await this.openMenu(col);
    await this.menuItem('Фильтр…').click();
  }

  filterValue(label: string): Locator {
    return this.filter.getByRole('checkbox', { name: label, exact: true });
  }

  filterField(label: string): Locator {
    return this.filter.getByLabel(label, { exact: true });
  }

  async applyFilter(): Promise<void> {
    await this.filter.getByRole('button', { name: 'Применить' }).click();
  }

  async resetFilter(): Promise<void> {
    await this.filter.getByRole('button', { name: 'Сбросить' }).click();
  }

  async textsIn(col: number, count: number): Promise<string[]> {
    return Promise.all(Array.from({ length: count }, (_, row) => this.cell(row, col).innerText()));
  }

  row(position: number): Locator {
    return this.viewport.locator(`[role="row"][aria-rowindex="${position + HEAD_ROWS + 1}"]`);
  }

  header(col: number): Locator {
    return this.viewport.locator(
      `.nui-grid__row--head [role="columnheader"][aria-colindex="${col + 1}"]`,
    );
  }

  band(label: string): Locator {
    return this.viewport.locator('.nui-grid__row--band [role="columnheader"]', { hasText: label });
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
    const texts = await this.textsIn(col, count);

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
    return this.page.evaluate((headRows) => {
      const cell = document.activeElement;

      if (cell === null || !cell.matches('.nui-grid__cell')) {
        return null;
      }
      const row = cell.closest('[role="row"]');

      return {
        row: Number(row?.getAttribute('aria-rowindex')) - headRows - 1,
        col: Number(cell.getAttribute('aria-colindex')) - 1,
      };
    }, HEAD_ROWS);
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
