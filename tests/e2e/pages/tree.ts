import type { Locator, Page } from '@playwright/test';

export interface TreeOutput {
  readonly selected: string | null;
  readonly expanded: readonly string[];
  readonly checked: readonly string[];
  readonly loaded: readonly string[];
  readonly virtualSelected: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const isTreeOutput = (
  data: Record<string, unknown>,
): data is Record<string, unknown> & TreeOutput =>
  isNullableString(data.selected) &&
  isStringList(data.expanded) &&
  isStringList(data.checked) &&
  isStringList(data.loaded) &&
  isNullableString(data.virtualSelected);

const parseTreeOutput = (text: string): TreeOutput => {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data) || !isTreeOutput(data)) {
    throw new Error(`Unexpected tree output: ${text}`);
  }
  return data;
};

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
      has: tree.page().locator('.nui-tree__label', { hasText: new RegExp(`^${escaped}$`) }),
    });
  }

  toggleOf(item: Locator): Locator {
    return item.locator('.nui-tree__toggle');
  }

  checkboxOf(item: Locator): Locator {
    return item.locator('.nui-tree__checkbox');
  }

  labelOf(item: Locator): Locator {
    return item.locator('.nui-tree__label');
  }

  activeLabel(tree: Locator): Promise<string | null> {
    return tree.evaluate((element) => {
      const id = element.getAttribute('aria-activedescendant');
      const active = id === null ? null : document.getElementById(id);
      return active?.querySelector('.nui-tree__label')?.textContent?.trim() ?? null;
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
