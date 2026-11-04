import { readFile } from 'node:fs/promises';
import { expect, type Locator, type Page } from '@playwright/test';
import { copiedTexts, stubClipboard } from '../helpers/clipboard';
import { boxOf, renderedWidth, type Box } from '../helpers/geometry';

export interface TableCell {
  readonly row: number;
  readonly col: number;
}

export interface TableJump {
  readonly rows: number;
  readonly headerGap: number;
}

export interface TableScroll {
  readonly top?: number;
  readonly left?: number;
}

const HEAD_ROWS = 2;

export class TableSection {
  readonly root: Locator;
  readonly viewport: Locator;
  readonly grid: Locator;
  readonly emptyToggle: Locator;
  readonly empty: Locator;
  readonly quick: Locator;
  readonly clearFilters: Locator;
  readonly output: Locator;
  readonly filter: Locator;
  readonly menu: Locator;
  readonly cellMenu: Locator;
  readonly resetColumns: Locator;
  readonly loadingToggle: Locator;
  readonly pagesToggle: Locator;
  readonly pinnedToggle: Locator;
  readonly pagination: Locator;
  readonly nextPageButton: Locator;
  readonly pageSizeTrigger: Locator;
  readonly tree: Locator;
  readonly remote: Locator;
  readonly remoteViewport: Locator;
  readonly remoteGrid: Locator;
  readonly remoteTree: Locator;
  readonly remoteTreeGrid: Locator;
  readonly remoteQuick: Locator;
  readonly remoteOutput: Locator;
  readonly remoteToggle: Locator;
  readonly treeCaption: Locator;
  readonly treeSelectAll: Locator;
  readonly treeSkeletons: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('table');
    this.viewport = this.root.locator('.nui-table__viewport');
    this.grid = this.root.locator('.nui-table__grid');
    this.emptyToggle = page.getByTestId('table-empty');
    this.empty = this.root.locator('.nui-table__empty');
    this.quick = page.getByTestId('table-quick');
    this.clearFilters = page.getByTestId('table-clear-filters');
    this.output = page.getByTestId('table-output');
    this.filter = page.locator('.nui-table-filter');
    this.menu = this.root.locator(':scope > .nui-menu:not(.nui-table__cell-menu)');
    this.cellMenu = this.root.locator(':scope > .nui-table__cell-menu');
    this.resetColumns = page.getByTestId('table-reset-columns');
    this.loadingToggle = page.getByTestId('table-loading');
    this.pagesToggle = page.getByTestId('table-pages');
    this.pinnedToggle = page.getByTestId('table-pinned');
    this.pagination = this.root.locator('.nui-table__pagination');
    this.nextPageButton = this.pagination.locator('.nui-pagination__next');
    this.pageSizeTrigger = this.pagination.getByRole('combobox');
    this.tree = page.getByTestId('table-tree');
    this.treeCaption = this.tree.locator('.nui-table__caption');
    this.treeSelectAll = this.tree.locator('.nui-table__row--head').getByRole('checkbox');
    this.treeSkeletons = this.tree.locator('.nui-table__row--skeleton');
    this.remote = page.getByTestId('table-remote');
    this.remoteViewport = this.remote.locator('.nui-table__viewport');
    this.remoteGrid = this.remote.locator('.nui-table__grid');
    this.remoteTree = page.getByTestId('table-remote-tree');
    this.remoteTreeGrid = this.remoteTree.locator('.nui-table__grid');
    this.remoteQuick = page.getByTestId('table-remote-quick');
    this.remoteOutput = page.getByTestId('table-remote-output');
    this.remoteToggle = page.getByTestId('table-remote-toggle');
  }

  remoteRow(position: number): Locator {
    return this.remoteViewport.locator(`[role="row"][aria-rowindex="${position + 2}"]`);
  }

  remoteCell(position: number, col: number): Locator {
    return this.remoteRow(position).locator(`> [aria-colindex="${col + 1}"]`);
  }

  remoteTreeRow(position: number): Locator {
    return this.remoteTree.locator(
      `.nui-table__viewport [role="row"][aria-rowindex="${position + 2}"]`,
    );
  }

  async toggleRemoteTreeRow(position: number): Promise<void> {
    const toggle = this.remoteTreeRow(position).locator('.nui-table__toggle--expandable');

    await toggle.hover();
    await toggle.click();
  }

  remoteGroupLabel(position: number): Locator {
    return this.remoteRow(position).locator('.nui-table__group');
  }

  async remoteGroupBy(label: string): Promise<void> {
    await this.page.getByTestId('table-remote-group').click();

    await this.page
      .locator('.nui-select__listbox')
      .getByRole('option', { name: label, exact: true })
      .click();
  }

  remoteHeader(col: number): Locator {
    return this.remoteViewport.locator(
      `.nui-table__row--head [role="columnheader"][aria-colindex="${col + 1}"]`,
    );
  }

  async remoteScroll(edge: 'top' | 'bottom'): Promise<void> {
    await this.remoteViewport.evaluate((element, where) => {
      element.scrollTop = where === 'top' ? 0 : element.scrollHeight;
    }, edge);
  }

  async remoteRequests(): Promise<number> {
    const text = (await this.remoteOutput.textContent()) ?? '{}';
    const parsed: unknown = JSON.parse(text);

    return typeof parsed === 'object' &&
      parsed !== null &&
      'requests' in parsed &&
      typeof parsed.requests === 'number'
      ? parsed.requests
      : 0;
  }

  treeCell(position: number, col: number): Locator {
    return this.treeRow(position).locator(`[aria-colindex="${col + 1}"]`);
  }

  treeGrip(position: number): Locator {
    return this.treeRow(position).locator('.nui-table__row-grip');
  }

  async dragTreeRow(from: number, to: number, zone: 'before' | 'after' | 'inside'): Promise<void> {
    await this.treeRow(from).hover();

    await expect.poll(() => renderedWidth(this.treeGrip(from))).toBeGreaterThan(20);

    const grip = await boxOf(this.treeGrip(from));
    const target = await boxOf(this.treeRow(to));
    const x = grip.x + grip.width / 2;
    const y = grip.y + grip.height / 2;
    const share = zone === 'before' ? 0.15 : zone === 'after' ? 0.85 : 0.5;

    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x, y + 8);
    await this.page.mouse.move(x, target.y + target.height * share, { steps: 6 });

    if (zone === 'inside') {
      await expect(this.tree.locator('.nui-table__drop--box')).toBeVisible();
    }
    await this.page.mouse.up();
  }

  treeCheckbox(position: number): Locator {
    return this.treeRow(position).getByRole('checkbox');
  }

  menuButton(col: number): Locator {
    return this.header(col).locator('.nui-table__menu');
  }

  async openMenu(col: number): Promise<void> {
    await this.header(col).scrollIntoViewIfNeeded();
    await this.clickRevealed(this.header(col), this.menuButton(col));
  }

  private async clickRevealed(cell: Locator, control: Locator): Promise<void> {
    if ((await renderedWidth(control)) > 20) {
      await control.click();
      return;
    }
    await cell.hover();
    await expect.poll(() => renderedWidth(control)).toBeGreaterThan(20);
    const box = await boxOf(control);

    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }

  headerPane(col: number): Promise<string> {
    return this.header(col).evaluate((element) => {
      if (element.classList.contains('nui-table__cell--pin-start')) {
        return 'start';
      }
      return element.classList.contains('nui-table__cell--pin-end') ? 'end' : 'centre';
    });
  }

  menuItem(label: string): Locator {
    const name = { name: label, exact: true };

    return this.menu
      .getByRole('menuitem', name)
      .or(this.menu.getByRole('menuitemradio', name))
      .or(this.menu.getByRole('menuitemcheckbox', name));
  }

  treeRow(position: number): Locator {
    return this.tree.locator(`.nui-table__viewport [role="row"][aria-rowindex="${position + 2}"]`);
  }

  treeToggle(position: number): Locator {
    return this.treeRow(position).locator('.nui-table__toggle--expandable');
  }

  async toggleTreeRow(position: number): Promise<void> {
    const toggle = this.treeToggle(position);

    await toggle.hover();
    await toggle.click();
  }

  footerCell(col: number): Locator {
    return this.root.locator(`.nui-table__footer [aria-colindex="${col + 1}"]`);
  }

  groupLabel(position: number): Locator {
    return this.row(position).locator('.nui-table__group');
  }

  async groupBy(label: string): Promise<void> {
    await this.page.getByTestId('table-group').click();
    await this.page.locator('.nui-select__listbox').getByRole('option', { name: label }).click();
  }

  grip(col: number): Locator {
    return this.header(col).locator('.nui-table__grip');
  }

  async sortBy(col: number, modifiers: Array<'Shift'> = []): Promise<void> {
    await this.header(col).locator('.nui-table__text').click({ modifiers });
  }

  async dragHeader(col: number, target: number): Promise<void> {
    await this.header(col).hover();

    await expect.poll(() => renderedWidth(this.grip(col))).toBeGreaterThan(8);

    const grip = await boxOf(this.grip(col));
    const destination = await boxOf(this.header(target));
    const x = grip.x + grip.width / 2;
    const y = grip.y + grip.height / 2;

    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + 8, y);
    await this.page.mouse.move(destination.x + destination.width * 0.75, y, { steps: 6 });
    await this.page.mouse.up();
  }

  resizer(col: number): Locator {
    return this.header(col).locator('.nui-table__resizer');
  }

  bandCell(label: string): Locator {
    return this.root.locator('.nui-table__row--band [role="columnheader"]', { hasText: label });
  }

  async dragBandResizer(label: string, dx: number): Promise<void> {
    await this.dragHandle(this.bandCell(label).locator('.nui-table__resizer'), dx);
  }

  async dragResizer(col: number, dx: number): Promise<void> {
    await this.dragHandle(this.resizer(col), dx);
  }

  private async dragHandle(handle: Locator, dx: number): Promise<void> {
    const box = await boxOf(handle);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + dx / 2, y);
    await this.page.mouse.move(x + dx, y, { steps: 4 });
    await this.page.mouse.up();
  }

  filterButton(col: number): Locator {
    return this.header(col).locator('.nui-table__filter');
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
      `.nui-table__row--head [role="columnheader"][aria-colindex="${col + 1}"]`,
    );
  }

  band(label: string): Locator {
    return this.viewport.locator('.nui-table__row--band [role="columnheader"]', { hasText: label });
  }

  cell(position: number, col: number): Locator {
    return this.row(position).locator(`[aria-colindex="${col + 1}"]`);
  }

  editor(): Locator {
    return this.viewport.locator('.nui-table__editor');
  }

  editorField(): Locator {
    return this.viewport.locator('.nui-table__editor input');
  }

  editorError(): Locator {
    return this.viewport.locator('.nui-table__error');
  }

  editorOption(label: string): Locator {
    return this.viewport
      .locator('.nui-table__editor')
      .getByRole('option', { name: label, exact: true });
  }

  async tapCell(position: number, col: number, times = 1): Promise<void> {
    const cell = this.cell(position, col);

    await cell.scrollIntoViewIfNeeded();

    const point = await cell.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const y = rect.top + rect.height / 2;

      for (let x = rect.left + 4; x < rect.right; x += 8) {
        if (element.contains(document.elementFromPoint(x, y))) {
          return { x, y };
        }
      }
      return { x: rect.left + rect.width / 2, y };
    });

    for (let tap = 0; tap < times; tap += 1) {
      await this.page.touchscreen.tap(point.x, point.y);
    }
  }

  cellMenuItem(label: string): Locator {
    return this.cellMenu.getByRole('menuitem', { name: label, exact: true });
  }

  stubClipboard(): Promise<void> {
    return stubClipboard(this.page);
  }

  async exportCsv(): Promise<string> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.getByTestId('table-export').click(),
    ]);

    return readFile(await download.path(), 'utf8');
  }

  async putInClipboard(text: string): Promise<void> {
    await this.page.evaluate((value) => {
      const area = document.createElement('textarea');

      area.id = 'clipboard-source';
      area.value = value;
      document.body.append(area);
      area.focus();
      area.select();
    }, text);

    await this.page.keyboard.press('ControlOrMeta+C');

    await this.page.evaluate(() => {
      document.getElementById('clipboard-source')?.remove();
    });
  }

  copiedTexts(): Promise<string[]> {
    return copiedTexts(this.page);
  }

  textSelection(): Promise<string> {
    return this.page.evaluate(() => window.getSelection()?.toString() ?? '');
  }

  cellBackground(position: number, col: number): Promise<string> {
    return this.cell(position, col).evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
  }

  async cellTexts(cells: readonly TableCell[]): Promise<string[]> {
    return Promise.all(
      cells.map(async (cell) => (await this.cell(cell.row, cell.col).textContent())?.trim() ?? ''),
    );
  }

  async dragRange(from: TableCell, to: TableCell, modifier?: 'ControlOrMeta'): Promise<void> {
    const start = await boxOf(this.cell(from.row, from.col));
    const end = await boxOf(this.cell(to.row, to.col));

    if (modifier !== undefined) {
      await this.page.keyboard.down(modifier);
    }
    await this.page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await this.page.mouse.down();

    await this.page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
      steps: 6,
    });

    await this.page.mouse.up();

    if (modifier !== undefined) {
      await this.page.keyboard.up(modifier);
    }
  }

  async longPress(position: number, col: number): Promise<void> {
    const cell = this.cell(position, col);
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
    await expect(this.cellMenu).toBeVisible();
    await cell.dispatchEvent('pointerup', init);
  }

  async scrollTo(target: TableScroll): Promise<void> {
    await this.viewport.evaluate((element, position) => {
      element.scrollTo(position);
    }, target);
  }

  async scrollToBottom(): Promise<void> {
    await this.viewport.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
  }

  jumpBeforeRender(top: number): Promise<TableJump> {
    return this.viewport.evaluate((element, target) => {
      element.scrollTop = target;
      const box = element.getBoundingClientRect();
      const first = element.querySelector('.nui-table__header .nui-table__cell');
      const last = element.querySelector('.nui-table__header > tr:last-child > .nui-table__cell');
      const lap = first === null ? 0 : Number.parseFloat(getComputedStyle(first).paddingTop);
      const offset = (first?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY) - box.top;
      const bodyTop = last?.getBoundingClientRect().bottom ?? box.top;

      const rows = Array.from(
        element.querySelectorAll('.nui-table__body > [role="row"] > .nui-table__cell:first-child'),
      ).reduce((count, cell) => {
        const rect = cell.getBoundingClientRect();
        return count + Number(rect.bottom > bodyTop && rect.top < box.bottom);
      }, 0);

      return { rows, headerGap: Math.max(offset, -lap - offset, 0) };
    }, top);
  }

  sortOrder(col: number): Locator {
    return this.header(col).locator('.nui-table__sort-order');
  }

  async numbersIn(col: number, count: number): Promise<number[]> {
    const texts = await this.textsIn(col, count);

    return texts.map((text) => Number(text.replaceAll(/\D/g, '')));
  }

  renderedRowCount(): Promise<number> {
    return this.viewport.evaluate(
      (element) => element.querySelectorAll('.nui-table__body > [role="row"]').length,
    );
  }

  scrollTop(): Promise<number> {
    return this.viewport.evaluate((element) => element.scrollTop);
  }

  focusNatively(target: Locator): Promise<void> {
    return target.evaluate(
      (element) =>
        new Promise<void>((resolve) => {
          if (element instanceof HTMLElement) {
            element.focus();
          }

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );
  }

  focusedCell(head: number = HEAD_ROWS): Promise<TableCell | null> {
    return this.page.evaluate((headRows) => {
      const cell = document.activeElement;

      if (cell === null || !cell.matches('.nui-table__cell')) {
        return null;
      }
      const row = cell.closest('[role="row"]');

      return {
        row: Number(row?.getAttribute('aria-rowindex')) - headRows - 1,
        col: Number(cell.getAttribute('aria-colindex')) - 1,
      };
    }, head);
  }

  viewportBox(): Promise<Box> {
    return boxOf(this.viewport);
  }

  cellBox(position: number, col: number): Promise<Box> {
    return boxOf(this.cell(position, col));
  }

  async headerBottom(): Promise<number> {
    const header = await boxOf(
      this.viewport.locator('.nui-table__header > tr:last-child > .nui-table__cell').first(),
    );

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
