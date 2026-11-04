import type { Locator, Page } from '@playwright/test';
import { boxOf, renderedWidth } from '../helpers/geometry';
import {
  isBoolean,
  isString,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';
import { sectionScope } from '../helpers/axe';

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

  itemLabel(key: string): Locator {
    return this.item(key).locator('.nui-row__title');
  }

  itemIcon(key: string): Locator {
    return this.item(key).locator('.nui-row__leading');
  }

  itemRow(key: string): Locator {
    return this.item(key).locator('xpath=..');
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

  async readOutput(): Promise<LayoutOutput> {
    return parseLayoutOutput(await this.output.innerText());
  }
}
