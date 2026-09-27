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
  readonly schemeToggle: Locator;
  readonly panelsToggle: Locator;
  readonly toggleOutput: Locator;
  readonly collapsible: Locator;
  readonly accordion: Locator;

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
    this.schemeToggle = page.getByTestId('toggle-scheme');
    this.panelsToggle = page.getByTestId('toggle-panels');
    this.toggleOutput = page.getByTestId('toggle-output');
    this.collapsible = page.getByTestId('collapsible');
    this.accordion = page.getByTestId('accordion');
  }

  triggerOf(block: Locator, label?: string): Locator {
    const triggers = block.locator('.nui-collapsible__trigger');

    return label === undefined ? triggers.first() : triggers.filter({ hasText: label });
  }

  contentOf(block: Locator, label?: string): Locator {
    const items = block.locator('.nui-collapsible');
    const item = label === undefined ? items.first() : items.filter({ hasText: label });

    return item.locator('.nui-collapsible__content');
  }

  panelHeightOf(block: Locator, label?: string): Promise<number> {
    return this.contentOf(block, label).evaluate((element) => element.clientHeight);
  }

  toggleItem(group: Locator, label: string): Locator {
    return group
      .locator('.nui-toggle-group__item', { hasText: label })
      .or(group.locator(`.nui-toggle-group__item[aria-label="${label}"]`));
  }

  async stubClipboard(): Promise<void> {
    await this.page.addInitScript(() => {
      const copies: string[] = [];

      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: (text: string) => Promise.resolve(copies.push(text)) },
      });

      Object.defineProperty(window, '__nuiCopies', { value: copies });
    });
  }

  copiedTexts(): Promise<string[]> {
    return this.page.evaluate(() => {
      const copies: unknown = Reflect.get(window, '__nuiCopies');

      return Array.isArray(copies) ? copies.filter((copy) => typeof copy === 'string') : [];
    });
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

  hasLineNumber(code: Locator, line: number): Promise<boolean> {
    return this.lineOf(code, line).evaluate((element) => {
      const style = getComputedStyle(element, '::before');

      return style.content === 'counter(line)' && Number.parseFloat(style.width) > 0;
    });
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
