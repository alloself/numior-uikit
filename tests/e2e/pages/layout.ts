import type { Locator, Page } from '@playwright/test';
import { boxOf } from '../helpers/geometry';
import {
  isBoolean,
  isString,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';

const isLayoutOutput = shapeOf({
  open: isBoolean,
  mobileOpen: isBoolean,
  active: isString,
  collapsible: isString,
  side: isString,
});

export type LayoutOutput = Guarded<typeof isLayoutOutput>;

const parseLayoutOutput = (text: string): LayoutOutput =>
  parseAs(text, isLayoutOutput, 'layout output');

export class LayoutSection {
  readonly root: Locator;
  readonly sidebar: Locator;
  readonly drawer: Locator;
  readonly trigger: Locator;
  readonly heading: Locator;
  readonly collapsible: Locator;
  readonly side: Locator;
  readonly subToggle: Locator;
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
    this.subToggle = page.getByTestId('layout-sub');
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

  async labelWidth(key: string): Promise<number> {
    const box = await this.itemLabel(key).boundingBox();
    return box?.width ?? 0;
  }

  async iconOffset(target: Locator): Promise<number> {
    const icon = await target.locator('.nui-row__leading').boundingBox();
    const bar = await this.sidebar.boundingBox();

    if (!icon || !bar) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.abs(icon.x + icon.width / 2 - (bar.x + bar.width / 2));
  }

  async opensUnderToggle(key: string): Promise<boolean> {
    const toggle = await this.subToggle.boundingBox();
    const item = await this.item(key).boundingBox();
    return toggle !== null && item !== null && item.y >= toggle.y + toggle.height - 1;
  }

  tooltip(text: string): Locator {
    return this.page.getByRole('tooltip').filter({ hasText: text });
  }

  content(): Locator {
    return this.root.locator('.nui-layout__body');
  }

  async sidebarWidth(): Promise<number> {
    const box = await this.sidebar.boundingBox();
    return box?.width ?? 0;
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

  async readOutput(): Promise<LayoutOutput> {
    return parseLayoutOutput(await this.output.innerText());
  }
}
