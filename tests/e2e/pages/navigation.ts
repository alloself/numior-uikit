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
import { ARROWS } from '../helpers/keyboard';
import type { Direction } from './playground';

export type NavigationOutput = Guarded<typeof isNavigationOutput>;

interface GuideStepBoxes {
  readonly indicator: Box;
  readonly title: Box;
  readonly content: Box | undefined;
  readonly connector: Box | undefined;
}

export interface GuideNumber {
  readonly offFirstLine: number;
  readonly atStart: boolean;
}

export interface GuideContent {
  readonly offTitleStart: number;
  readonly belowTitle: boolean;
}

export interface GuideLine {
  readonly gapAbove: number;
  readonly gapBelow: number;
  readonly offNumberCentre: number;
}

export interface GuideLayout {
  readonly numbers: readonly GuideNumber[];
  readonly contents: readonly GuideContent[];
  readonly lines: readonly GuideLine[];
  readonly lastHasLine: boolean;
}

const SIGN: Readonly<Record<Direction, number>> = { ltr: 1, rtl: -1 };

const startOf = (box: Box, direction: Direction): number =>
  direction === 'ltr' ? box.x : box.x + box.width;

const endOf = (box: Box, direction: Direction): number =>
  direction === 'ltr' ? box.x + box.width : box.x;

const bottomOf = (box: Box): number => box.y + box.height;

const centreXOf = (box: Box): number => box.x + box.width / 2;

const centreYOf = (box: Box): number => box.y + box.height / 2;

const contentOf = ({ title, content }: GuideStepBoxes, direction: Direction): GuideContent[] =>
  content === undefined
    ? []
    : [
        {
          offTitleStart: Math.abs(startOf(content, direction) - startOf(title, direction)),
          belowTitle: content.y > bottomOf(title),
        },
      ];

const lineOf = (step: GuideStepBoxes, next: GuideStepBoxes | undefined): GuideLine[] =>
  step.connector === undefined || next === undefined
    ? []
    : [
        {
          gapAbove: step.connector.y - bottomOf(step.indicator),
          gapBelow: next.indicator.y - bottomOf(step.connector),
          offNumberCentre: centreXOf(step.connector) - centreXOf(step.indicator),
        },
      ];

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
  readonly guideStepper: Locator;
  readonly stepperBack: Locator;
  readonly stepperNext: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
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
    this.guideStepper = page.getByTestId('nav-stepper-guide');
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

  guideSteps(): Locator {
    return this.guideStepper.getByRole('listitem');
  }

  async guideLayout(direction: Direction): Promise<GuideLayout> {
    const indexes = Array.from({ length: await this.guideSteps().count() }, (_, index) => index);
    const steps = await Promise.all(indexes.map((index) => this.guideStep(index)));
    const lines = await Promise.all(indexes.map((index) => this.guideTitleFirstLine(index)));

    return {
      numbers: steps.map((step, index) => ({
        offFirstLine: Math.abs(centreYOf(step.indicator) - (lines[index] ?? Number.NaN)),
        atStart:
          (startOf(step.title, direction) - endOf(step.indicator, direction)) * SIGN[direction] >=
          0,
      })),
      contents: steps.flatMap((step) => contentOf(step, direction)),
      lines: steps.flatMap((step, index) => lineOf(step, steps[index + 1])),
      lastHasLine: steps.at(-1)?.connector !== undefined,
    };
  }

  private async guideStep(index: number): Promise<GuideStepBoxes> {
    const step = this.guideSteps().nth(index);

    const [indicator, title, content, connector] = await Promise.all([
      boxOf(step.locator('.nui-stepper-step__indicator')),
      boxOf(step.locator('.nui-stepper-step__title')),
      step.locator('.nui-stepper-step__content').count(),
      step.locator('.nui-stepper-step__connector').isVisible(),
    ]);

    return {
      indicator,
      title,
      content: content > 0 ? await boxOf(step.locator('.nui-stepper-step__content')) : undefined,
      connector: connector ? await boxOf(step.locator('.nui-stepper-step__connector')) : undefined,
    };
  }

  private async guideTitleFirstLine(index: number): Promise<number> {
    const title = this.guideSteps().nth(index).locator('.nui-stepper-step__title');

    return title.evaluate((element) => {
      const range = document.createRange();

      range.selectNodeContents(element);

      const line = [...range.getClientRects()].find((rect) => rect.height > 0);

      return line ? line.top + line.height / 2 : Number.NaN;
    });
  }

  async closeMenu(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async focusNextItem(): Promise<void> {
    await this.page.keyboard.press('ArrowDown');
  }

  async focusPreviousItem(): Promise<void> {
    await this.page.keyboard.press('ArrowUp');
  }

  async focusLastItem(): Promise<void> {
    await this.page.keyboard.press('End');
  }

  async openFocusedTriggerWith(key: 'Enter' | 'Space'): Promise<void> {
    await this.page.keyboard.press(key);
  }

  async openSubmenu(): Promise<void> {
    await this.page.keyboard.press('ArrowRight');
  }

  async closeSubmenu(): Promise<void> {
    await this.page.keyboard.press('ArrowLeft');
  }

  async movePointerAway(): Promise<void> {
    await this.page.mouse.move(0, 0);
  }

  async clickOutside(): Promise<void> {
    await this.page.mouse.click(4, 4);
  }

  async moveTabFocus(direction: 'left' | 'right'): Promise<void> {
    await this.page.keyboard.press(ARROWS[direction]);
  }

  async focusFirstTab(): Promise<void> {
    await this.page.keyboard.press('Home');
  }

  async activateFocused(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async closeFocusedTab(): Promise<void> {
    await this.page.keyboard.press('Delete');
  }

  async tabForward(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  async turnWheel(deltaY: number): Promise<void> {
    await this.page.mouse.wheel(0, deltaY);
  }

  pageScrollY(): Promise<number> {
    return this.page.evaluate(() => window.scrollY);
  }

  async typeInMenu(character: string): Promise<void> {
    await this.menu.locator(':focus').dispatchEvent('keydown', { key: character });
  }

  async readOutput(): Promise<NavigationOutput> {
    return parseNavigationOutput(await this.output.innerText());
  }
}
