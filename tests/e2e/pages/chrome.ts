import type { Locator, Page } from '@playwright/test';
import { copiedTexts, stubClipboard } from '../helpers/clipboard';
import { paintedRgbAt, rgbDelta } from '../helpers/color';
import { beforeBoxOf, boxOf, type PseudoBox } from '../helpers/geometry';

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
  readonly commandOpen: Locator;
  readonly commandOutput: Locator;
  readonly commandDialog: Locator;
  readonly commandInput: Locator;
  readonly toc: Locator;
  readonly tocArticle: Locator;
  readonly tocMarkerSwitch: Locator;
  readonly splitter: Locator;
  readonly splitterDivider: Locator;
  readonly splitterStart: Locator;

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
    this.commandOpen = page.getByTestId('command-open');
    this.commandOutput = page.getByTestId('command-output');
    this.commandDialog = page.getByTestId('command-dialog');
    this.commandInput = this.commandDialog.locator('.nui-command__input');
    this.toc = page.getByTestId('toc');
    this.tocArticle = page.getByTestId('toc-article');
    this.tocMarkerSwitch = page.getByRole('switch', { name: 'Квадратный маркер' });
    this.splitter = page.getByTestId('splitter');
    this.splitterDivider = this.splitter.locator('.nui-splitter__divider');
    this.splitterStart = page.getByTestId('splitter-start');
  }

  async dragDividerBy(offset: number): Promise<void> {
    const box = await boxOf(this.splitterDivider);

    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + offset / 2, y);
    await this.page.mouse.move(x + offset, y);
    await this.page.mouse.up();
  }

  splitterValue(): Promise<number> {
    return this.splitterDivider.evaluate((element) =>
      Number(element.getAttribute('aria-valuenow')),
    );
  }

  tocLinks(): Locator {
    return this.toc.locator('.nui-toc__link');
  }

  currentTocLink(): Locator {
    return this.toc.locator('[aria-current="location"]');
  }

  currentTocMarker(): Promise<PseudoBox> {
    return beforeBoxOf(this.currentTocLink());
  }

  scrollArticleTo(id: string): Promise<void> {
    return this.tocArticle.evaluate((element, target) => {
      const heading = element.querySelector(`#${target}`);

      if (!(heading instanceof HTMLElement) || !(element instanceof HTMLElement)) {
        return;
      }

      element.scrollTop = heading.offsetTop - element.offsetTop;
    }, id);
  }

  commandOptions(): Locator {
    return this.commandDialog.getByRole('option');
  }

  activeCommand(): Locator {
    return this.commandDialog.locator('.nui-list-item--active .nui-row__title');
  }

  triggerOf(block: Locator, label?: string): Locator {
    const triggers = block.locator('.nui-collapsible__trigger');

    return label === undefined ? triggers.first() : triggers.filter({ hasText: label });
  }

  contentOf(block: Locator, label?: string): Locator {
    if (label === undefined) {
      return block.locator('.nui-collapsible__content').first();
    }
    return block
      .locator('.nui-collapsible', { hasText: label })
      .locator('.nui-collapsible__content');
  }

  panelHeightOf(block: Locator, label?: string): Promise<number> {
    return this.contentOf(block, label).evaluate((element) => element.clientHeight);
  }

  toggleItem(group: Locator, label: string): Locator {
    return group
      .locator('.nui-toggle-group__item', { hasText: label })
      .or(group.locator(`.nui-toggle-group__item[aria-label="${label}"]`));
  }

  stubClipboard(): Promise<void> {
    return stubClipboard(this.page);
  }

  copiedTexts(): Promise<string[]> {
    return copiedTexts(this.page);
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

  linePaddingOf(code: Locator): Promise<number> {
    return this.lineOf(code, 1).evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).paddingInlineStart),
    );
  }

  async dialogCornerClipped(): Promise<boolean> {
    const [corner, inside] = await paintedRgbAt(this.commandDialog, [
      [1, 1],
      [24, 6],
    ]);

    return corner !== undefined && inside !== undefined && rgbDelta(corner, inside) > 8;
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
