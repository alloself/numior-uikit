import type { Locator, Page } from '@playwright/test';
import {
  isString,
  listOf,
  nullable,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';

const isTreeOutput = shapeOf({
  selected: nullable(isString),
  expanded: listOf(isString),
  checked: listOf(isString),
  loaded: listOf(isString),
  virtualSelected: nullable(isString),
});

export type TreeOutput = Guarded<typeof isTreeOutput>;

const parseTreeOutput = (text: string): TreeOutput => parseAs(text, isTreeOutput, 'tree output');

export class TreeSection {
  readonly tree: Locator;
  readonly checkTree: Locator;
  readonly virtualTree: Locator;
  readonly output: Locator;

  constructor(page: Page) {
    this.tree = page.getByTestId('data-tree');
    this.checkTree = page.getByTestId('data-tree-check');
    this.virtualTree = page.getByTestId('data-tree-virtual');
    this.output = page.getByTestId('tree-output');
  }

  item(tree: Locator, label: string): Locator {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return tree.locator('[role="treeitem"]:not(.nui-tree__item--leaving)', {
      has: tree.page().locator('.nui-row__title', { hasText: new RegExp(`^${escaped}$`) }),
    });
  }

  toggleOf(item: Locator): Locator {
    return item.locator('.nui-tree__toggle');
  }

  checkboxOf(item: Locator): Locator {
    return item.locator('.nui-tree__checkbox');
  }

  labelOf(item: Locator): Locator {
    return item.locator('.nui-row__title');
  }

  activeLabel(tree: Locator): Promise<string | null> {
    return tree.evaluate((element) => {
      const id = element.getAttribute('aria-activedescendant');
      const active = id === null ? null : document.getElementById(id);
      return active?.querySelector('.nui-row__title')?.textContent?.trim() ?? null;
    });
  }

  async typeIn(tree: Locator, key: string): Promise<void> {
    await tree.dispatchEvent('keydown', { key });
  }

  renderedCount(tree: Locator): Promise<number> {
    return tree.locator('[role="treeitem"]:not(.nui-tree__item--leaving)').count();
  }

  async readOutput(): Promise<TreeOutput> {
    return parseTreeOutput(await this.output.innerText());
  }
}
