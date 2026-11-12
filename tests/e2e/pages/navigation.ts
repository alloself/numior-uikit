import type { Locator, Page } from '@playwright/test';
import {
  isBoolean,
  isString,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';
import { boxOf, type Box } from '../helpers/geometry';
import { sectionScope } from '../helpers/axe';

export type NavigationOutput = Guarded<typeof isNavigationOutput>;

const isNavigationOutput = shapeOf({
  menuOpen: isBoolean,
  gridOn: isBoolean,
  sort: isString,
  lastAction: isString,
  tab: isString,
  manualTab: isString,
  signupStep: isString,
  settingsStep: isString,
});

const parseNavigationOutput = (text: string): NavigationOutput =>
  parseAs(text, isNavigationOutput, 'navigation output');

export class NavigationSection {
  readonly scope = sectionScope('navigation');

  readonly menuTrigger: Locator;
  readonly menu: Locator;
  readonly subTrigger: Locator;
  readonly subMenu: Locator;
  readonly externalLink: Locator;
  readonly tabs: Locator;
  readonly manualTabs: Locator;
  readonly closableTabs: Locator;
  readonly linkTabs: Locator;
  readonly overflowTabs: Locator;
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
    this.closableTabs = page.getByTestId('nav-tabs-closable');
    this.linkTabs = page.getByTestId('nav-tabs-links');
    this.overflowTabs = page.getByTestId('nav-tabs-overflow');
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

  async itemRinged(label: string): Promise<boolean> {
    return this.item(label).evaluate((element) => {
      const style = getComputedStyle(element);

      return style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0;
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

  pageLink(label: string): Locator {
    return this.linkTabs.getByRole('link', { name: label });
  }

  get currentPage(): Locator {
    return this.linkTabs.locator('[aria-current="page"]');
  }

  get openDocuments(): Locator {
    return this.closableTabs.getByRole('tab');
  }

  get documentPanel(): Locator {
    return this.closableTabs.getByRole('tabpanel');
  }

  documentTab(label: string): Locator {
    return this.closableTabs.getByRole('tab', { name: label, exact: true });
  }

  documentCross(label: string): Locator {
    return this.documentTab(label).locator('xpath=..').locator('.nui-tab__close');
  }

  async indicatorDrift(tabs: Locator, tab: Locator): Promise<{ start: number; size: number }> {
    const indicator = await this.indicatorBox(tabs);
    const selected = await boxOf(tab);

    return {
      start: Math.abs(Math.round(indicator.x - selected.x)),
      size: Math.abs(Math.round(indicator.width - selected.width)),
    };
  }

  monthTab(label: string): Locator {
    return this.overflowTabs.getByRole('tab', { name: label });
  }

  get monthTrack(): Locator {
    return this.overflowTabs.locator('.nui-tab-list__track');
  }

  tabEdge(side: 'start' | 'end'): Locator {
    return this.overflowTabs.locator(`.nui-tab-list__edge--${side} button`);
  }

  monthScroll(): Promise<number> {
    return this.monthTrack.evaluate((track) => Math.round(Math.abs(track.scrollLeft)));
  }

  get activePanel(): Locator {
    return this.tabs.getByRole('tabpanel');
  }

  get manualPanel(): Locator {
    return this.manualTabs.getByRole('tabpanel');
  }

  indicatorBox(tabs: Locator): Promise<Box> {
    return boxOf(tabs.locator('.nui-tab-list__indicator'));
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

  async summaryGrowth(stepper: Locator): Promise<number> {
    const [summary, label] = await Promise.all([
      boxOf(this.stepperSummary(stepper)),
      boxOf(stepper.locator('.nui-stepper__summary-label')),
    ]);

    return summary.height - label.height;
  }

  async typeInMenu(character: string): Promise<void> {
    await this.menu.locator(':focus').dispatchEvent('keydown', { key: character });
  }

  async readOutput(): Promise<NavigationOutput> {
    return parseNavigationOutput(await this.output.innerText());
  }
}
