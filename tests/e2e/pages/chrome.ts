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
  readonly titledCode: Locator;
  readonly plainCode: Locator;

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
    this.titledCode = page.getByTestId('code-titled');
    this.plainCode = page.getByTestId('code-plain');
  }

  copyButtonOf(code: Locator): Locator {
    return code.locator('.nui-code__copy');
  }

  expandButtonOf(code: Locator): Locator {
    return code.locator('.nui-code__expand');
  }

  lineOf(code: Locator, line: number): Locator {
    return code.locator('.nui-code__line').nth(line - 1);
  }

  lineNumberOf(code: Locator, line: number): Promise<string> {
    return this.lineOf(code, line).evaluate((element) =>
      getComputedStyle(element, '::before').content.replaceAll('"', ''),
    );
  }

  bodyHeightOf(code: Locator): Promise<number> {
    return code.locator('.nui-code__body').evaluate((element) => element.clientHeight);
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
