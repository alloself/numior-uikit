import type { Locator, Page } from '@playwright/test';

export interface NavigationOutput {
  readonly menuOpen: boolean;
  readonly gridOn: boolean;
  readonly sort: string;
  readonly lastAction: string;
  readonly tab: string;
  readonly manualTab: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseNavigationOutput = (text: string): NavigationOutput => {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data)) {
    throw new Error('Navigation output is not an object');
  }
  const { menuOpen, gridOn, sort, lastAction, tab, manualTab } = data;
  if (
    typeof menuOpen !== 'boolean' ||
    typeof gridOn !== 'boolean' ||
    typeof sort !== 'string' ||
    typeof lastAction !== 'string' ||
    typeof tab !== 'string' ||
    typeof manualTab !== 'string'
  ) {
    throw new Error(`Unexpected navigation output: ${text}`);
  }
  return { menuOpen, gridOn, sort, lastAction, tab, manualTab };
};

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export class NavigationSection {
  readonly menuTrigger: Locator;
  readonly menu: Locator;
  readonly subTrigger: Locator;
  readonly subMenu: Locator;
  readonly externalLink: Locator;
  readonly tabs: Locator;
  readonly manualTabs: Locator;
  readonly crumbs: Locator;
  readonly shortCrumbs: Locator;
  readonly output: Locator;

  constructor(page: Page) {
    this.menuTrigger = page.getByTestId('nav-menu-trigger');
    this.menu = page.getByTestId('nav-menu');
    this.subTrigger = this.menu.locator('.nui-menu-item--sub');
    this.subMenu = this.menu.locator('.nui-menu--sub');
    this.externalLink = page.getByTestId('nav-link-external');
    this.tabs = page.getByTestId('nav-tabs');
    this.manualTabs = page.getByTestId('nav-tabs-manual');
    this.crumbs = page.getByTestId('nav-crumbs');
    this.shortCrumbs = page.getByTestId('nav-crumbs-short');
    this.output = page.getByTestId('navigation-output');
  }

  item(label: string): Locator {
    return this.menu.locator('.nui-menu-item:not(.nui-menu--sub .nui-menu-item)', {
      hasText: label,
    });
  }

  subItem(label: string): Locator {
    return this.subMenu.locator('.nui-menu-item', { hasText: label });
  }

  tab(label: string): Locator {
    return this.tabs.getByRole('tab', { name: label });
  }

  manualTab(label: string): Locator {
    return this.manualTabs.getByRole('tab', { name: label });
  }

  get activePanel(): Locator {
    return this.tabs.getByRole('tabpanel');
  }

  get manualPanel(): Locator {
    return this.manualTabs.getByRole('tabpanel');
  }

  async indicatorBox(tabs: Locator): Promise<Box> {
    const box = await tabs.locator('.nui-tab-list__indicator').boundingBox();
    if (!box) {
      throw new Error('Tab indicator has no bounding box');
    }
    return box;
  }

  crumbLinks(crumbs: Locator): Locator {
    return crumbs.getByRole('link');
  }

  currentCrumb(crumbs: Locator): Locator {
    return crumbs.locator('[aria-current="page"]');
  }

  get moreButton(): Locator {
    return this.crumbs.getByRole('button', { name: 'Показать путь' });
  }

  get moreMenu(): Locator {
    return this.crumbs.locator('.nui-menu');
  }

  hiddenCrumb(label: string): Locator {
    return this.moreMenu.locator('.nui-menu-item', { hasText: label });
  }

  async typeInMenu(character: string): Promise<void> {
    await this.menu.locator(':focus').dispatchEvent('keydown', { key: character });
  }

  async readOutput(): Promise<NavigationOutput> {
    return parseNavigationOutput(await this.output.innerText());
  }
}
