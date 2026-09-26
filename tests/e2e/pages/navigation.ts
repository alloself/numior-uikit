import type { Locator, Page } from '@playwright/test';

export interface NavigationOutput {
  readonly menuOpen: boolean;
  readonly gridOn: boolean;
  readonly sort: string;
  readonly lastAction: string;
  readonly tab: string;
  readonly manualTab: string;
  readonly signupStep: string;
  readonly settingsStep: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const flag = (data: Record<string, unknown>, key: string): boolean => {
  const value = data[key];

  if (typeof value !== 'boolean') {
    throw new Error(`Unexpected ${key} in navigation output: ${String(value)}`);
  }

  return value;
};

const word = (data: Record<string, unknown>, key: string): string => {
  const value = data[key];

  if (typeof value !== 'string') {
    throw new Error(`Unexpected ${key} in navigation output: ${String(value)}`);
  }

  return value;
};

const parseNavigationOutput = (text: string): NavigationOutput => {
  const data: unknown = JSON.parse(text);

  if (!isRecord(data)) {
    throw new Error('Navigation output is not an object');
  }

  return {
    menuOpen: flag(data, 'menuOpen'),
    gridOn: flag(data, 'gridOn'),
    sort: word(data, 'sort'),
    lastAction: word(data, 'lastAction'),
    tab: word(data, 'tab'),
    manualTab: word(data, 'manualTab'),
    signupStep: word(data, 'signupStep'),
    settingsStep: word(data, 'settingsStep'),
  };
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
  readonly stepper: Locator;
  readonly verticalStepper: Locator;
  readonly stepperBack: Locator;
  readonly stepperNext: Locator;
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
    this.stepper = page.getByTestId('nav-stepper');
    this.verticalStepper = page.getByTestId('nav-stepper-vertical');
    this.stepperBack = page.getByTestId('nav-stepper-back');
    this.stepperNext = page.getByTestId('nav-stepper-next');
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

  step(stepper: Locator, name: string): Locator {
    return stepper.locator('.nui-stepper__step').filter({ hasText: name });
  }

  stepButtons(stepper: Locator): Locator {
    return stepper.getByRole('button');
  }

  currentStep(stepper: Locator): Locator {
    return stepper.locator('[aria-current="step"]');
  }

  stepperSummary(stepper: Locator): Locator {
    return stepper.locator('.nui-stepper__summary');
  }

  async typeInMenu(character: string): Promise<void> {
    await this.menu.locator(':focus').dispatchEvent('keydown', { key: character });
  }

  async readOutput(): Promise<NavigationOutput> {
    return parseNavigationOutput(await this.output.innerText());
  }
}
