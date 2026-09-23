import type { Locator, Page } from '@playwright/test';

export type DrawerSide = 'start' | 'end' | 'top' | 'bottom';

export interface OverlaysOutput {
  readonly dialogOpen: boolean;
  readonly dialogResult: string;
  readonly persistentOpen: boolean;
  readonly drawerOpen: boolean;
  readonly side: string;
  readonly popoverOpen: boolean;
  readonly tooltipOpen: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseOverlaysOutput = (text: string): OverlaysOutput => {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data)) {
    throw new Error('Overlays output is not an object');
  }
  const { dialogOpen, dialogResult, persistentOpen, drawerOpen, side, popoverOpen, tooltipOpen } =
    data;
  if (
    typeof dialogOpen !== 'boolean' ||
    typeof dialogResult !== 'string' ||
    typeof persistentOpen !== 'boolean' ||
    typeof drawerOpen !== 'boolean' ||
    typeof side !== 'string' ||
    typeof popoverOpen !== 'boolean' ||
    typeof tooltipOpen !== 'boolean'
  ) {
    throw new Error(`Unexpected overlays output: ${text}`);
  }
  return { dialogOpen, dialogResult, persistentOpen, drawerOpen, side, popoverOpen, tooltipOpen };
};

export class OverlaysSection {
  readonly dialogOpen: Locator;
  readonly dialog: Locator;
  readonly dialogConfirm: Locator;
  readonly persistentOpen: Locator;
  readonly persistentDialog: Locator;
  readonly persistentClose: Locator;
  readonly drawerOpen: Locator;
  readonly drawer: Locator;
  readonly drawerInput: Locator;
  readonly drawerSide: Locator;
  readonly nestedDialogOpen: Locator;
  readonly nestedDialog: Locator;
  readonly popoverTrigger: Locator;
  readonly popover: Locator;
  readonly popoverInput: Locator;
  readonly tooltipTrigger: Locator;
  readonly tooltip: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.dialogOpen = page.getByTestId('dialog-open');
    this.dialog = page.getByTestId('dialog');
    this.dialogConfirm = page.getByTestId('dialog-confirm');
    this.persistentOpen = page.getByTestId('persistent-open');
    this.persistentDialog = page.getByTestId('persistent-dialog');
    this.persistentClose = page.getByTestId('persistent-close');
    this.drawerOpen = page.getByTestId('drawer-open');
    this.drawer = page.getByTestId('drawer');
    this.drawerInput = page.getByTestId('drawer-input');
    this.drawerSide = page.getByTestId('drawer-side');
    this.nestedDialogOpen = page.getByTestId('nested-dialog-open');
    this.nestedDialog = page.getByTestId('nested-dialog');
    this.popoverTrigger = page.getByTestId('popover-trigger');
    this.popover = page.getByTestId('popover');
    this.popoverInput = page.getByTestId('popover-input');
    this.tooltipTrigger = page.getByTestId('tooltip-trigger');
    this.tooltip = page.getByTestId('tooltip');
    this.output = page.getByTestId('overlays-output');
  }

  async setDrawerSide(side: DrawerSide): Promise<void> {
    await this.drawerSide.selectOption(side);
  }

  async clickBackdrop(): Promise<void> {
    await this.page.mouse.click(4, 4);
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  focusIsInside(surface: Locator): Promise<boolean> {
    return surface.evaluate((element) => element.contains(document.activeElement));
  }

  documentOverflow(): Promise<string> {
    return this.page.evaluate(() => getComputedStyle(document.documentElement).overflow);
  }

  fixedViewportWidth(): Promise<number> {
    return this.page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;inset:0;pointer-events:none;visibility:hidden';
      document.body.append(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return Math.round(width);
    });
  }

  isInsideViewport(surface: Locator): Promise<boolean> {
    return surface.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.left >= 0 &&
        rect.top >= 0 &&
        rect.right <= window.innerWidth &&
        rect.bottom <= window.innerHeight
      );
    });
  }

  async edges(surface: Locator): Promise<{ readonly right: number; readonly top: number }> {
    const box = await surface.boundingBox();
    if (!box) {
      throw new Error('Surface has no bounding box');
    }
    return { right: Math.round(box.x + box.width), top: Math.round(box.y) };
  }

  async readOutput(): Promise<OverlaysOutput> {
    return parseOverlaysOutput(await this.output.innerText());
  }
}
