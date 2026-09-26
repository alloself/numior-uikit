import type { Locator, Page } from '@playwright/test';

export interface LayoutOutput {
  readonly open: boolean;
  readonly mobileOpen: boolean;
  readonly active: string;
  readonly collapsible: string;
  readonly side: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isString = (value: unknown): value is string => typeof value === 'string';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const field = <T>(
  data: Record<string, unknown>,
  key: string,
  guard: (value: unknown) => value is T,
): T => {
  const value = data[key];

  if (!guard(value)) {
    throw new Error(`Unexpected ${key} in layout output: ${String(value)}`);
  }

  return value;
};

const parseLayoutOutput = (text: string): LayoutOutput => {
  const data: unknown = JSON.parse(text);

  if (!isRecord(data)) {
    throw new Error('Layout output is not an object');
  }

  return {
    open: field(data, 'open', isBoolean),
    mobileOpen: field(data, 'mobileOpen', isBoolean),
    active: field(data, 'active', isString),
    collapsible: field(data, 'collapsible', isString),
    side: field(data, 'side', isString),
  };
};

export class LayoutSection {
  readonly root: Locator;
  readonly sidebar: Locator;
  readonly drawer: Locator;
  readonly trigger: Locator;
  readonly heading: Locator;
  readonly collapsible: Locator;
  readonly side: Locator;
  readonly subToggle: Locator;
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

  async readOutput(): Promise<LayoutOutput> {
    return parseLayoutOutput(await this.output.innerText());
  }
}
