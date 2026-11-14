import type { FrameLocator, Locator, Page } from '@playwright/test';
import { wcagViolationsOf, type AxeViolations } from '../helpers/axe';
import { copiedTexts, stubClipboard } from '../helpers/clipboard';
import { boxOf } from '../helpers/geometry';
import { MainFrameNetwork } from '../helpers/network';
import { accentOf, schemeOf } from '../helpers/theme';

export type DocsScheme = 'light' | 'dark' | 'system';

export class DocsExample {
  readonly root: Locator;
  readonly previewToggle: Locator;
  readonly codeToggle: Locator;
  readonly invertTheme: Locator;
  readonly rtl: Locator;
  readonly copy: Locator;
  readonly preview: Locator;
  readonly code: Locator;

  constructor(page: Page, previewLabel: string) {
    this.preview = page.locator(`[role="group"][aria-label="${previewLabel}"]`).first();
    this.root = this.preview.locator('xpath=ancestor::*[contains(@class, "nui-tabs")][1]');
    this.previewToggle = this.root.getByRole('tab', { name: previewLabel });
    this.codeToggle = this.root.getByRole('tab', { name: 'Код' });
    this.invertTheme = this.root.getByRole('button', { name: 'Обратная тема' });
    this.rtl = this.root.getByRole('button', { name: 'Справа налево' });
    this.copy = this.root.getByRole('button', { name: 'Скопировать код' });
    this.code = this.root.locator('.nui-code__code');
  }

  radiusOf(name: string): Promise<string> {
    return this.preview
      .getByRole('button', { name })
      .evaluate((element) => getComputedStyle(element).borderRadius);
  }
}

export class DocsThemeCompare {
  constructor(private readonly page: Page) {}

  screen(label: string): FrameLocator {
    return this.page.frameLocator(`iframe[title="${label}"]`);
  }

  async radiusOf(label: string, name: string): Promise<string> {
    return (await this.button(label, name)).evaluate(
      (element) => getComputedStyle(element).borderRadius,
    );
  }

  async fontOf(label: string, name: string): Promise<string> {
    return (await this.button(label, name)).evaluate(
      (element) => getComputedStyle(element).fontFamily,
    );
  }

  private async button(label: string, name: string): Promise<Locator> {
    await this.page.locator(`iframe[title="${label}"]`).scrollIntoViewIfNeeded();

    return this.screen(label).getByRole('button', { name });
  }
}

export class DocsConfigurator {
  readonly panel: Locator;
  readonly preview: Locator;
  readonly code: Locator;
  readonly files: Locator;
  private readonly frame: Locator;

  constructor(private readonly page: Page) {
    this.panel = page.locator('form[aria-label="Свойства"]');
    this.preview = this.panel.locator('..').locator('[role="group"][aria-label="Превью"]').first();

    this.frame = this.panel.locator('xpath=ancestor::*[contains(@class, "nui-tabs")][1]');
    this.code = this.frame.locator('.nui-code__code').first();
    this.files = this.frame.getByRole('tablist', { name: 'Файлы примера' }).getByRole('tab');
  }

  async showCode(): Promise<void> {
    await this.frame.getByRole('tab', { name: 'Код', exact: true }).click();
  }

  async showPreview(): Promise<void> {
    await this.frame.getByRole('tab', { name: 'Превью', exact: true }).click();
  }

  async choose(label: string, option: string): Promise<void> {
    const group = this.panel.getByRole('radiogroup', { name: label });

    if ((await group.count()) > 0) {
      await group.getByRole('radio', { name: option }).click();
      return;
    }
    await this.panel.getByRole('combobox', { name: label }).click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  async enable(label: string): Promise<void> {
    await this.panel.getByRole('switch', { name: label }).check();
  }

  caretColor(): Promise<string> {
    return this.preview
      .locator('input, textarea')
      .first()
      .evaluate((control) => getComputedStyle(control).caretColor);
  }
}

export class DocsBlock {
  readonly screen: Locator;
  readonly content: FrameLocator;
  readonly code: Locator;
  private readonly frame: Locator;

  constructor(page: Page, name: string) {
    this.screen = page.locator(`iframe[src$="/blocks/view/${name}"]`);
    this.content = page.frameLocator(`iframe[src$="/blocks/view/${name}"]`);
    this.frame = this.screen.locator('xpath=ancestor::*[contains(@class, "nui-tabs")][1]');
    this.code = this.frame.locator('.nui-code__code').first();
  }

  async resize(label: string): Promise<void> {
    await this.frame.getByRole('radio', { name: label }).click();
  }

  async showCode(): Promise<void> {
    await this.frame.getByRole('tab', { name: 'Код', exact: true }).click();
  }

  async width(): Promise<number> {
    return (await boxOf(this.screen)).width;
  }

  async height(): Promise<number> {
    return (await boxOf(this.screen)).height;
  }

  async hiddenHeight(): Promise<number> {
    const content = await this.content.locator('html').evaluate((root) => root.scrollHeight);

    return content - Math.round(await this.height());
  }

  async hiddenWidth(): Promise<number> {
    const content = await this.content.locator('html').evaluate((root) => root.scrollWidth);

    return content - Math.round(await this.width());
  }

  theme(): Promise<string | null> {
    return schemeOf(this.content.locator('html'));
  }
}

export class DocsHome {
  readonly title: Locator;
  readonly start: Locator;
  readonly copyInstall: Locator;
  readonly screen: FrameLocator;
  private readonly options: Locator;

  constructor(private readonly page: Page) {
    this.title = page.getByRole('heading', { level: 1 });
    this.start = page.getByRole('link', { name: 'Начать', exact: true });

    this.copyInstall = page
      .getByRole('region', { name: 'UI-кит для Vue 3' })
      .getByRole('button', { name: 'Скопировать код' });

    this.screen = page.frameLocator('iframe[src$="/blocks/view/AppShell"]');
    this.options = page.getByRole('group', { name: 'Вид кабинета' });
  }

  screenScheme(): Promise<string | null> {
    return schemeOf(this.screen.locator('html'));
  }

  screenAccent(): Promise<string | null> {
    return accentOf(this.screen.locator('html'));
  }

  screenDirection(): Promise<string | null> {
    return this.screen.locator('html').getAttribute('dir');
  }

  siteAccent(): Promise<string | null> {
    return accentOf(this.page.locator('html'));
  }

  siteDirection(): Promise<string | null> {
    return this.page.locator('html').getAttribute('dir');
  }

  async pick(label: string): Promise<void> {
    await this.options.getByRole('radio', { name: label, exact: true }).click();
  }

  async turnRightToLeft(): Promise<void> {
    await this.options.getByRole('button', { name: 'Справа налево' }).click();
  }

  async pickAccent(label: string): Promise<void> {
    await this.options.getByRole('combobox', { name: 'Акцент' }).click();
    await this.page.getByRole('option', { name: label, exact: true }).click();
  }

  section(title: string): Locator {
    return this.page.getByRole('region', { name: title });
  }
}

export class DocsSite {
  readonly header: Locator;
  readonly sidebar: Locator;
  readonly drawer: Locator;
  readonly trigger: Locator;
  readonly toc: Locator;
  readonly article: Locator;
  readonly main: Locator;
  readonly searchButton: Locator;
  readonly themeButton: Locator;
  readonly languageButton: Locator;
  readonly commandDialog: Locator;
  readonly commandInput: Locator;
  readonly copyPage: Locator;
  readonly tooltip: Locator;
  readonly network: MainFrameNetwork;

  constructor(readonly page: Page) {
    this.network = new MainFrameNetwork(page);
    this.tooltip = page.getByRole('tooltip');
    this.header = page.locator('.nui-app-bar');
    this.copyPage = page.getByRole('button', { name: 'Скопировать страницу' });
    this.sidebar = page.locator('aside.nui-sidebar');
    this.drawer = page.locator('dialog.nui-sidebar-drawer');
    this.trigger = page.locator('.nui-sidebar-trigger');
    this.toc = page.locator('nav.nui-toc');
    this.article = page.locator('#docs-content');
    this.main = page.locator('#docs-layout-content');
    this.searchButton = this.header.getByRole('button', { name: /Поиск|Search/ });
    this.themeButton = this.header.getByRole('button', { name: /^(Тема|Theme)$/ });
    this.languageButton = this.header.getByRole('button', { name: /^(Язык|Language)$/ });
    this.commandDialog = page.locator('.nui-command-dialog:not(#docs-content *)');
    this.commandInput = this.commandDialog.locator('.nui-command__input');
  }

  async open(path: string, scheme?: DocsScheme): Promise<void> {
    if (scheme !== undefined) {
      await this.page.addInitScript((value) => localStorage.setItem('nui-theme', value), scheme);
    }
    await this.page.goto(path, { waitUntil: 'load' });
    await this.network.quiet();

    await this.page
      .locator('.nui-layout:not(.nui-layout--pending), main#docs-content')
      .first()
      .waitFor();
  }

  get heading(): Locator {
    return this.article.getByRole('heading', { level: 1 });
  }

  async follow(link: string): Promise<void> {
    await this.article.getByRole('link', { name: link, exact: true }).click();
    await this.network.quiet();
  }

  codeGaps(): Promise<number[]> {
    return this.article.evaluate((article) => {
      const boxes = [...article.querySelectorAll('.nui-code')].reduce<DOMRect[]>((shown, code) => {
        const box = code.getBoundingClientRect();

        if (box.height > 0) {
          shown.push(box);
        }
        return shown;
      }, []);

      return boxes.slice(1).map((box, index) => Math.round(box.top - (boxes[index]?.bottom ?? 0)));
    });
  }

  async sectionTop(title: string): Promise<number> {
    const heading = this.article.getByRole('heading', { name: title }).first();

    return Math.round((await boxOf(heading)).y);
  }

  get toasts(): Locator {
    return this.page.locator('.nui-toast:not(.nui-toast--leaving)');
  }

  get inputFrame(): Locator {
    return this.article.locator('.nui-input').first();
  }

  get editorFrame(): Locator {
    return this.page.locator('.nui-editor').first();
  }

  get sheetNameBox(): Locator {
    return this.page.locator('.nui-spreadsheet__name').first();
  }

  get sheetEntry(): Locator {
    return this.page.locator('.nui-spreadsheet__entry').first();
  }

  similarPage(name: string): Locator {
    return this.article
      .getByRole('navigation', { name: 'Похожие страницы' })
      .getByRole('link', { name, exact: true });
  }

  get footer(): Locator {
    return this.page.getByRole('contentinfo');
  }

  footerLink(text: string): Locator {
    return this.footer.getByRole('link', { name: text, exact: true });
  }

  navLink(text: string): Locator {
    return this.header.getByRole('link', { name: text, exact: true });
  }

  sidebarLink(text: string): Locator {
    return this.sidebar.getByRole('link', { name: text, exact: true });
  }

  drawerLink(text: string): Locator {
    return this.drawer.getByRole('link', { name: text, exact: true });
  }

  get currentSidebarLink(): Locator {
    return this.sidebar.locator('[aria-current="page"]');
  }

  get currentTocLink(): Locator {
    return this.toc.locator('a[aria-current="location"]');
  }

  get commandOptions(): Locator {
    return this.commandDialog.getByRole('option');
  }

  get commandGroups(): Locator {
    return this.commandDialog.locator('.nui-list__group-label');
  }

  get commandMarks(): Locator {
    return this.commandDialog.locator('mark');
  }

  commandOption(name: string): Locator {
    return this.commandDialog.getByRole('option', { name, exact: true });
  }

  pressSearchHotkeyOnRussianLayout(): Promise<void> {
    return this.page.locator('body').dispatchEvent('keydown', {
      key: 'л',
      code: 'KeyK',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
  }

  async pickTheme(name: string): Promise<void> {
    await this.themeButton.click();
    await this.page.getByRole('menuitemradio', { name }).click();
  }

  async pickLanguage(name: string): Promise<void> {
    await this.languageButton.click();
    await this.page.getByRole('menuitem', { name }).click();
  }

  async scrollToEnd(): Promise<void> {
    await this.footer.evaluate((element) => {
      element.scrollIntoView({ block: 'end' });
    });
  }

  async tocTop(): Promise<number> {
    return (await boxOf(this.toc)).y;
  }

  async scrollTo(id: string): Promise<void> {
    await this.page.locator(`#${id}`).evaluate((element) => {
      element.scrollIntoView({ block: 'start' });
    });
  }

  scrollLeftOf(target: Locator): Promise<number> {
    return target.evaluate((element) => element.scrollLeft);
  }

  get iconSearch(): Locator {
    return this.article.getByRole('searchbox', { name: /Найти иконку|Find an icon/ });
  }

  get iconRows(): Locator {
    return this.article
      .getByRole('grid', { name: /Иконки компонентов|Component icons/ })
      .locator('.nui-table__body [role="row"]');
  }

  copyIconName(name: string): Locator {
    return this.article.getByRole('button', { name: `Скопировать имя ${name}`, exact: true });
  }

  tokenRow(name: string): Locator {
    return this.article
      .getByRole('row')
      .filter({ has: this.page.locator('code').getByText(name, { exact: true }) });
  }

  tokenSwatches(name: string): Locator {
    return this.tokenRow(name).locator(':is(.nui-theme--light, .nui-theme--dark) > span');
  }

  codeVariant(name: string): Locator {
    return this.article.getByRole('tab', { name, exact: true }).first();
  }

  get shownVariant(): Locator {
    return this.article.getByRole('tabpanel').first().locator('.nui-code__code');
  }

  get codeScroller(): Locator {
    return this.article.locator('.nui-code__pre').first();
  }

  scheme(): Promise<string | null> {
    return schemeOf(this.page.locator('html'));
  }

  example(previewLabel = 'Превью'): DocsExample {
    return new DocsExample(this.page, previewLabel);
  }

  block(name: string): DocsBlock {
    return new DocsBlock(this.page, name);
  }

  themeCompare(): DocsThemeCompare {
    return new DocsThemeCompare(this.page);
  }

  configurator(): DocsConfigurator {
    return new DocsConfigurator(this.page);
  }

  home(): DocsHome {
    return new DocsHome(this.page);
  }

  async markdownOf(path: string): Promise<string> {
    const response = await this.page.request.get(path, { headers: { Accept: 'text/markdown' } });

    return response.ok() ? response.text() : '';
  }

  stubClipboard(): Promise<void> {
    return stubClipboard(this.page);
  }

  copiedTexts(): Promise<string[]> {
    return copiedTexts(this.page);
  }

  async emulate(options: {
    colorScheme?: 'light' | 'dark';
    reducedMotion?: 'reduce' | 'no-preference';
  }): Promise<void> {
    await this.page.emulateMedia(options);
  }

  wcagViolations(): Promise<AxeViolations> {
    return wcagViolationsOf(this.page);
  }
}
