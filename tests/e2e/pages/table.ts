import { readFile } from 'node:fs/promises';
import { expect, type Locator, type Page } from '@playwright/test';
import { copiedTexts, stubClipboard } from '../helpers/clipboard';
import { unlikePixels } from '../helpers/color';
import { boxOf, dragAcross, renderedWidth, type Box } from '../helpers/geometry';
import { sectionScope } from '../helpers/axe';
import { ARROWS, type ArrowDirection } from '../helpers/keyboard';
import { GridKeys } from './grid-keys';

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

export interface DropLineDrift {
  readonly scrolled: number;
  readonly farthest: number;
}

export interface HandleLayout {
  readonly grip: number;
  readonly gripSize: number;
  readonly icon: number;
  readonly label: number;
  readonly font: string;
}

interface HandleParts {
  readonly grip: string;
  readonly label: string;
}

interface TableLayer {
  readonly scrollRects?: readonly {
    readonly type: string;
    readonly rect: { readonly width: number; readonly height: number };
  }[];
}

const HEAD_ROWS = 2;
const EDGE_REACH = 8;
const SCROLL_REPAINT = 'RepaintsOnScroll';
const LAYER_SLACK = 2;
const LEAK = 2;
const HEADER_TOP = 2;
const HEADER_EDGE = 3;
const FOOTER_TOP = 2;
const FOOTER_EDGE = 4;
const FRAME_CORNER = 12;

const HEADER_PARTS: HandleParts = { grip: '.nui-table__grip', label: '.nui-table__text' };

const GHOST_PARTS: HandleParts = {
  grip: '.nui-table__ghost-grip',
  label: '.nui-table__ghost-label',
};

const handleLayoutOf = (frame: Element, parts: HandleParts): HandleLayout => {
  const edge = frame.getBoundingClientRect().left;
  const grip = frame.querySelector(parts.grip);
  const label = frame.querySelector(parts.label);

  if (grip === null || label === null) {
    throw new Error('The frame has no grip or label');
  }
  const gripBox = grip.getBoundingClientRect();
  const icon = grip.querySelector('svg')?.getBoundingClientRect().width ?? 0;
  const style = getComputedStyle(label);

  return {
    grip: Math.round(gripBox.left - edge),
    gripSize: Math.round(gripBox.width),
    icon: Math.round(icon),
    label: Math.round(label.getBoundingClientRect().left - edge),
    font: `${style.fontSize} ${style.fontWeight} ${style.color}`,
  };
};

const BODY_PAINT = `
  [data-testid='table'] .nui-table__body .nui-table__cell {
    background-color: blue !important;
    background-image: none !important;
    color: blue !important;
  }
`;

const BODY_HIDE = `
  [data-testid='table'] .nui-table__body {
    visibility: hidden !important;
  }
`;

export class TableSection extends GridKeys {
  readonly scope = sectionScope('table');

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

  constructor(page: Page) {
    super(page);
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

  async widenFocusedColumn(): Promise<void> {
    await this.page.keyboard.press('Alt+ArrowRight');
  }

  async narrowFocusedColumn(): Promise<void> {
    await this.page.keyboard.press('Alt+ArrowLeft');
  }

  async reorderFocused(direction: ArrowDirection): Promise<void> {
    await this.page.keyboard.press(`Alt+Shift+${ARROWS[direction]}`);
  }

  async openFocusedHeaderMenu(): Promise<void> {
    await this.page.keyboard.press('Alt+ArrowDown');
  }

  async openCellMenuFromKeyboard(): Promise<void> {
    await this.page.keyboard.press('Shift+F10');
  }

  async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async pressTab(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  async typeText(text: string): Promise<void> {
    await this.page.keyboard.type(text);
  }

  async focusFirstOption(): Promise<void> {
    await this.page.keyboard.press('Home');
  }

  async jumpToRowEnd(): Promise<void> {
    await this.page.keyboard.press('End');
  }

  async toggleFocusedSelection(): Promise<void> {
    await this.page.keyboard.press(' ');
  }

  async selectAll(): Promise<void> {
    await this.page.keyboard.press('ControlOrMeta+A');
  }

  async clearSelection(): Promise<void> {
    await this.page.keyboard.press('Delete');
  }

  async copySelection(): Promise<void> {
    await this.page.keyboard.press('ControlOrMeta+C');
  }

  async cutSelection(): Promise<void> {
    await this.page.keyboard.press('ControlOrMeta+X');
  }

  async pasteClipboard(): Promise<void> {
    await this.page.keyboard.press('ControlOrMeta+V');
  }

  async undo(): Promise<void> {
    await this.page.keyboard.press('ControlOrMeta+Z');
  }

  async redo(): Promise<void> {
    await this.page.keyboard.press('ControlOrMeta+Shift+Z');
  }

  pageSizeOption(size: string): Locator {
    return this.page.locator('.nui-select__listbox').getByRole('option', { name: size });
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

  async dragTreeRowAndReturn(from: number, over: number): Promise<void> {
    await this.treeRow(from).hover();

    await expect.poll(() => renderedWidth(this.treeGrip(from))).toBeGreaterThan(20);

    const grip = await boxOf(this.treeGrip(from));
    const own = await boxOf(this.treeRow(from));
    const other = await boxOf(this.treeRow(over));
    const x = grip.x + grip.width / 2;
    const y = grip.y + grip.height / 2;
    const mark = this.tree.locator('.nui-table__drop');

    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x, y + 8);
    await this.page.mouse.move(x, other.y + other.height * 0.85, { steps: 6 });
    await expect(mark).toBeVisible();

    await this.page.mouse.move(x, own.y + own.height / 2, { steps: 6 });
    await expect(mark).toBeHidden();

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
    await this.header(col).hover();

    await expect.poll(() => this.headerSettled(col)).toBe(true);

    await this.header(col).locator('.nui-table__text').click({ modifiers });
  }

  private headerSettled(col: number): Promise<boolean> {
    return this.header(col).evaluate((header) => {
      const grip = header.querySelector('.nui-table__grip');
      const opened = grip === null || grip.getBoundingClientRect().width > 8;

      return opened && header.getAnimations({ subtree: true }).length === 0;
    });
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

  async headerHandles(col: number): Promise<HandleLayout> {
    await this.header(col).hover();

    await expect.poll(() => this.headerSettled(col)).toBe(true);

    return this.header(col).evaluate(handleLayoutOf, HEADER_PARTS);
  }

  async menuInset(col: number): Promise<number> {
    const cell = await boxOf(this.header(col));
    const menu = await boxOf(this.menuButton(col));

    return Math.round(cell.x + cell.width - (menu.x + menu.width));
  }

  async liftHeader(col: number): Promise<void> {
    await this.header(col).hover();

    await expect.poll(() => renderedWidth(this.grip(col))).toBeGreaterThan(8);

    const grip = await boxOf(this.grip(col));
    const x = grip.x + grip.width / 2;
    const y = grip.y + grip.height / 2;

    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + 24, y, { steps: 4 });
    await expect(this.columnGhost).toBeVisible();
  }

  get columnGhost(): Locator {
    return this.root.locator('.nui-table__ghost--x .nui-table__ghost-body');
  }

  ghostHandles(): Promise<HandleLayout> {
    return this.columnGhost.evaluate(handleLayoutOf, GHOST_PARTS);
  }

  async liftTreeRow(position: number): Promise<Box> {
    await this.treeRow(position).hover();

    await expect.poll(() => renderedWidth(this.treeGrip(position))).toBeGreaterThan(20);

    const grip = await boxOf(this.treeGrip(position));
    const x = grip.x + grip.width / 2;
    const y = grip.y + grip.height / 2;

    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x, y + 24, { steps: 4 });
    await expect(this.treeGhostGrip).toBeVisible();

    return grip;
  }

  get treeGhostGrip(): Locator {
    return this.tree.locator('.nui-table__ghost--y .nui-table__ghost-grip');
  }

  async release(): Promise<void> {
    await this.page.mouse.up();
  }

  async carryHeaderToEdge(col: number): Promise<void> {
    await this.header(col).hover();

    await expect.poll(() => renderedWidth(this.grip(col))).toBeGreaterThan(8);

    const grip = await boxOf(this.grip(col));
    const view = await boxOf(this.viewport);
    const x = grip.x + grip.width / 2;
    const y = grip.y + grip.height / 2;

    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + 8, y);
    await this.page.mouse.move(view.x + view.width - EDGE_REACH, y, { steps: 4 });
  }

  async dropLineDrift(frames: number): Promise<DropLineDrift> {
    return this.root.evaluate(
      (root, count) =>
        new Promise<DropLineDrift>((resolve) => {
          const viewport = root.querySelector('.nui-table__viewport');
          const from = viewport?.scrollLeft ?? 0;
          const seen = { frames: 0, farthest: 0 };

          const watch = (): void => {
            const line = root.querySelector('.nui-table__drop--x')?.getBoundingClientRect();
            const heads = root.querySelectorAll('.nui-table__row--head [role="columnheader"]');

            const gaps = Array.from(heads, (head) => {
              const rect = head.getBoundingClientRect();
              const middle = line === undefined ? Number.NaN : line.left + line.width / 2;

              return Math.min(Math.abs(rect.left - middle), Math.abs(rect.right - middle));
            });

            seen.farthest = Math.max(seen.farthest, Math.min(...gaps));
            seen.frames += 1;

            if (seen.frames < count) {
              requestAnimationFrame(watch);
              return;
            }
            resolve({ scrolled: (viewport?.scrollLeft ?? 0) - from, farthest: seen.farthest });
          };

          requestAnimationFrame(watch);
        }),
      frames,
    );
  }

  async releasePointer(): Promise<void> {
    await this.page.mouse.up();
  }

  resizer(col: number): Locator {
    return this.header(col).locator('.nui-table__resizer');
  }

  bandCell(label: string): Locator {
    return this.root.locator('.nui-table__row--band [role="columnheader"]', { hasText: label });
  }

  async dragBandResizer(label: string, dx: number): Promise<void> {
    await dragAcross(this.bandCell(label).locator('.nui-table__resizer'), dx);
  }

  async dragResizer(col: number, dx: number): Promise<void> {
    await dragAcross(this.resizer(col), dx);
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

  get filterSearch(): Locator {
    return this.filter.getByRole('searchbox', { name: 'Поиск', exact: true });
  }

  get filterAll(): Locator {
    return this.filter.getByRole('checkbox', { name: 'Выбрать все', exact: true });
  }

  get filterValues(): Locator {
    return this.filter.locator('.nui-table-filter__values').getByRole('checkbox');
  }

  get filterNote(): Locator {
    return this.filter.locator('.nui-table-filter__note');
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

  async selectCellText(position: number, col: number): Promise<void> {
    const box = await boxOf(this.cell(position, col));
    const y = box.y + box.height / 2;

    await this.page.mouse.move(box.x + 4, y);
    await this.page.mouse.down();
    await this.page.mouse.move(box.x + box.width - 4, y, { steps: 6 });
    await this.page.mouse.up();
  }

  selectedCells(): Locator {
    return this.root.locator('.nui-table__cell[aria-selected="true"]');
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

    if (modifier === undefined) {
      return;
    }

    await this.page.keyboard.up(modifier);
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

  async repaintsOnScroll(): Promise<boolean> {
    const session = await this.viewport.page().context().newCDPSession(this.viewport.page());
    const box = await boxOf(this.viewport);

    const layers = await new Promise<readonly TableLayer[]>((resolve) => {
      session.once('LayerTree.layerTreeDidChange', (event) => {
        resolve(event.layers ?? []);
      });

      void session.send('LayerTree.enable');
    });

    await session.detach();

    return layers.some((layer) =>
      (layer.scrollRects ?? []).some(
        (area) =>
          area.type === SCROLL_REPAINT &&
          Math.abs(area.rect.width - box.width) < LAYER_SLACK &&
          Math.abs(area.rect.height - box.height) < LAYER_SLACK,
      ),
    );
  }

  async fadesBackgroundUnder(row: number, col: number): Promise<boolean> {
    await this.cell(row, col).hover();

    return this.row(row).evaluate((element) =>
      element
        .getAnimations()
        .some(
          (animation) =>
            animation instanceof CSSTransition &&
            animation.transitionProperty === 'background-color',
        ),
    );
  }

  private async shotWith(css: string): Promise<Buffer> {
    const style = await this.page.addStyleTag({ content: css });

    await this.viewport.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );

    const shot = await this.page.screenshot({ animations: 'disabled' });

    await style.evaluate((element) => {
      element.parentNode?.removeChild(element);
    });

    return shot;
  }

  async headerLeak(target: TableScroll): Promise<number> {
    await this.scrollTo(target);

    const [frame, last] = await Promise.all([
      boxOf(this.root),
      boxOf(this.root.locator('.nui-table__header > tr:last-child > .nui-table__cell').first()),
    ]);

    return this.bodyLeak({
      x: frame.x + FRAME_CORNER,
      y: frame.y + HEADER_TOP,
      width: frame.width - 2 * FRAME_CORNER,
      height: last.y + last.height - frame.y - HEADER_TOP - HEADER_EDGE,
    });
  }

  async footerLeak(target: TableScroll): Promise<number> {
    await this.scrollTo(target);

    const [frame, first] = await Promise.all([
      boxOf(this.root),
      boxOf(this.root.locator('.nui-table__footer .nui-table__cell').first()),
    ]);

    return this.bodyLeak({
      x: frame.x + FRAME_CORNER,
      y: first.y + FOOTER_TOP,
      width: frame.width - 2 * FRAME_CORNER,
      height: first.height - FOOTER_TOP - FOOTER_EDGE,
    });
  }

  private async bodyLeak(area: Box): Promise<number> {
    const hidden = await this.shotWith(BODY_HIDE);
    const painted = await this.shotWith(BODY_PAINT);

    return unlikePixels(this.page, [hidden, painted], { ...area, delta: LEAK });
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
