import type { Locator, Page } from '@playwright/test';
import { beforeBoxOf, boxOf, renderedWidth, type PseudoBox } from '../helpers/geometry';
import {
  isBoolean,
  isString,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';
import { sectionScope } from '../helpers/axe';
import { paintedRgb, type Rgb } from '../helpers/color';

export interface BadgeOnIcon {
  readonly fromIconEnd: number;
  readonly fromIconStart: number;
  readonly fromIconTop: number;
  readonly width: number;
  readonly height: number;
  readonly insideBar: boolean;
}

export type LayoutOutput = Guarded<typeof isLayoutOutput>;

const isLayoutOutput = shapeOf({
  open: isBoolean,
  mobileOpen: isBoolean,
  active: isString,
  collapsible: isString,
  side: isString,
  variant: isString,
});

const parseLayoutOutput = (text: string): LayoutOutput =>
  parseAs(text, isLayoutOutput, 'layout output');

export class LayoutSection {
  readonly scope = sectionScope('layout');

  readonly root: Locator;
  readonly sidebar: Locator;
  readonly drawer: Locator;
  readonly trigger: Locator;
  readonly heading: Locator;
  readonly collapsible: Locator;
  readonly side: Locator;
  readonly variant: Locator;
  readonly marker: Locator;
  readonly subToggle: Locator;
  readonly subIcon: Locator;
  readonly flyout: Locator;
  readonly header: Locator;
  readonly endToggle: Locator;
  readonly endColumn: Locator;
  readonly gotoReport: Locator;
  readonly groupToggle: Locator;
  readonly appBar: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('layout');
    this.sidebar = this.root.locator('aside.nui-sidebar');
    this.drawer = page.locator('dialog.nui-sidebar-drawer');
    this.trigger = page.getByTestId('layout-trigger');
    this.heading = page.getByTestId('layout-heading');
    this.collapsible = page.getByTestId('layout-collapsible');
    this.side = page.getByTestId('layout-side');
    this.variant = page.getByTestId('layout-variant');
    this.marker = page.getByTestId('layout-marker');
    this.subToggle = page.getByTestId('layout-sub');
    this.subIcon = this.subToggle.locator('.nui-row__leading');
    this.flyout = this.root.locator('.nui-sidebar-sub__flyout');
    this.header = page.getByTestId('layout-header');
    this.endToggle = page.getByTestId('layout-end-toggle');
    this.endColumn = page.getByTestId('layout-end');
    this.gotoReport = page.getByTestId('layout-goto-report');
    this.groupToggle = page.getByTestId('layout-group').locator('.nui-sidebar-group__toggle');
    this.appBar = this.root.locator('.nui-app-bar');
    this.output = page.getByTestId('layout-output');
  }

  item(key: string): Locator {
    return this.page.getByTestId(`layout-item-${key}`);
  }

  markerOf(key: string): Promise<PseudoBox> {
    return beforeBoxOf(this.item(key), '.nui-list-item');
  }

  paintOf(key: string): Promise<Rgb> {
    return paintedRgb(this.item(key));
  }

  itemLabel(key: string): Locator {
    return this.item(key).locator('.nui-row__title');
  }

  itemIcon(key: string): Locator {
    return this.item(key).locator('.nui-row__leading');
  }

  itemRow(key: string): Locator {
    return this.item(key).locator('xpath=..');
  }

  itemBadge(key: string): Locator {
    return this.item(key).locator('.nui-badge');
  }

  async badgeOnIcon(key: string): Promise<BadgeOnIcon> {
    const [icon, badge, bar] = await Promise.all([
      boxOf(this.itemIcon(key)),
      boxOf(this.itemBadge(key)),
      boxOf(this.sidebar),
    ]);

    const centre = { x: badge.x + badge.width / 2, y: badge.y + badge.height / 2 };

    return {
      fromIconEnd: centre.x - (icon.x + icon.width),
      fromIconStart: centre.x - icon.x,
      fromIconTop: centre.y - icon.y,
      width: badge.width,
      height: badge.height,
      insideBar: badge.x >= bar.x && badge.x + badge.width <= bar.x + bar.width,
    };
  }

  badgeClipped(key: string): Promise<boolean> {
    return this.itemBadge(key)
      .locator('.nui-badge__label')
      .evaluate((label) => label.scrollWidth > label.clientWidth);
  }

  labelWidth(key: string): Promise<number> {
    return renderedWidth(this.itemLabel(key));
  }

  async iconOffset(target: Locator): Promise<number> {
    const icon = await boxOf(target.locator('.nui-row__leading'));
    const bar = await boxOf(this.sidebar);

    return Math.abs(icon.x + icon.width / 2 - (bar.x + bar.width / 2));
  }

  async opensUnderToggle(key: string): Promise<boolean> {
    const toggle = await boxOf(this.subToggle);
    const item = await boxOf(this.item(key));

    return item.y >= toggle.y + toggle.height - 1;
  }

  tooltip(text: string): Locator {
    return this.page.getByRole('tooltip').filter({ hasText: text });
  }

  content(): Locator {
    return this.root.locator('.nui-layout__body');
  }

  sidebarWidth(): Promise<number> {
    return renderedWidth(this.sidebar);
  }

  async appBarInset(): Promise<number> {
    const [frame, bar] = await Promise.all([boxOf(this.root), boxOf(this.appBar)]);

    return bar.x - frame.x;
  }

  async triggerStart(): Promise<number> {
    const [frame, trigger] = await Promise.all([boxOf(this.root), boxOf(this.trigger)]);

    return trigger.x - frame.x;
  }

  async triggerOffset(): Promise<number> {
    const [rail, trigger] = await Promise.all([boxOf(this.sidebar), boxOf(this.trigger)]);

    return Math.abs(trigger.x + trigger.width / 2 - (rail.x + rail.width / 2));
  }

  async textStart(): Promise<number> {
    const [frame, text] = await Promise.all([
      boxOf(this.root),
      boxOf(this.root.locator('.layout-page p')),
    ]);

    return text.x - frame.x;
  }

  async headingStart(): Promise<number> {
    const [frame, heading] = await Promise.all([boxOf(this.root), boxOf(this.heading)]);

    return heading.x - frame.x;
  }

  async appBarEndGap(): Promise<number> {
    const [bar, end] = await Promise.all([
      boxOf(this.appBar),
      boxOf(this.appBar.locator('.nui-app-bar__end')),
    ]);

    return Math.round(bar.x + bar.width - (end.x + end.width));
  }

  async triggerIconStart(): Promise<number> {
    const [frame, icon] = await Promise.all([boxOf(this.root), boxOf(this.trigger.locator('svg'))]);

    return icon.x - frame.x;
  }

  async appBarWidthGap(): Promise<number> {
    const [frame, bar] = await Promise.all([boxOf(this.root), boxOf(this.appBar)]);

    return Math.abs(bar.width - frame.width);
  }

  async endColumnGap(): Promise<number> {
    const [frame, end] = await Promise.all([boxOf(this.root), boxOf(this.endColumn)]);

    return Math.abs(end.x + end.width - (frame.x + frame.width));
  }

  async bodyInsets(): Promise<{ start: number; end: number; top: number }> {
    const [frame, body] = await Promise.all([boxOf(this.root), boxOf(this.content())]);

    return {
      start: body.x - frame.x,
      end: frame.x + frame.width - (body.x + body.width),
      top: body.y - frame.y,
    };
  }

  bodyRadius(): Promise<number> {
    return this.content().evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).borderStartStartRadius),
    );
  }

  async surfaces(): Promise<{ frame: string; body: string }> {
    const [frame, body] = await Promise.all([
      this.root.evaluate((element) => getComputedStyle(element).backgroundColor),
      this.content().evaluate((element) => getComputedStyle(element).backgroundColor),
    ]);

    return { frame, body };
  }

  sidebarFrame(): Promise<{ padding: number; border: number; radius: number }> {
    return this.sidebar.evaluate((element) => {
      const own = getComputedStyle(element);
      const card = getComputedStyle(element, '::before');

      return {
        padding: Number.parseFloat(own.paddingInlineStart),
        border: Number.parseFloat(card.borderTopWidth) || 0,
        radius: Number.parseFloat(card.borderTopLeftRadius) || 0,
      };
    });
  }

  async toggleSidebarWithShortcut(): Promise<void> {
    await this.page.keyboard.press('Control+b');
  }

  async expandFocusedGroup(): Promise<void> {
    await this.page.keyboard.press('ArrowRight');
  }

  async activateFocused(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async focusNextItem(): Promise<void> {
    await this.page.keyboard.press('ArrowDown');
  }

  async closeFlyout(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async readOutput(): Promise<LayoutOutput> {
    return parseLayoutOutput(await this.output.innerText());
  }
}
