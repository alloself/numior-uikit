import type { Locator, Page } from '@playwright/test';

export class ChromeSection {
  readonly root: Locator;
  readonly toolbar: Locator;
  readonly verticalSeparator: Locator;
  readonly decorativeSeparator: Locator;
  readonly horizontalSeparator: Locator;
  readonly labelledSeparator: Locator;
  readonly comboKbd: Locator;
  readonly listKbd: Locator;
  readonly plainKbd: Locator;

  constructor(readonly page: Page) {
    this.root = page.locator('section[aria-labelledby="chrome-title"]');
    this.toolbar = page.getByTestId('chrome-toolbar');
    this.verticalSeparator = page.getByTestId('separator-vertical');
    this.decorativeSeparator = page.getByTestId('separator-decorative');
    this.horizontalSeparator = page.getByTestId('separator-horizontal');
    this.labelledSeparator = page.getByTestId('separator-labelled');
    this.comboKbd = page.getByTestId('kbd-combo');
    this.listKbd = page.getByTestId('kbd-list');
    this.plainKbd = page.getByTestId('kbd-plain');
  }

  keysOf(kbd: Locator): Promise<string[]> {
    return kbd.locator('.nui-kbd__key').allInnerTexts();
  }

  firstKeyOf(kbd: Locator): Locator {
    return kbd.locator('.nui-kbd__key').first();
  }

  isApplePlatform(): Promise<boolean> {
    return this.page.evaluate(() => /mac|iphone|ipad|ipod/i.test(navigator.platform));
  }

  labelLineWidth(): Promise<number> {
    return this.labelledSeparator.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element, '::before').width),
    );
  }
}
