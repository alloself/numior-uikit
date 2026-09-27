import { AxeBuilder } from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { copiedTexts, stubClipboard } from '../helpers/clipboard';

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
}

export class DocsConfigurator {
  readonly panel: Locator;
  readonly preview: Locator;
  readonly code: Locator;

  constructor(page: Page) {
    this.panel = page.locator('form[aria-label="Свойства"]');
    this.preview = this.panel.locator('..').locator('[role="group"][aria-label="Превью"]').first();
    this.code = this.panel.locator('..').locator('.nui-code__code');
  }

  async choose(label: string, option: string): Promise<void> {
    await this.panel
      .getByRole('group', { name: label })
      .getByRole('radio', { name: option })
      .click();
  }

  async enable(label: string): Promise<void> {
    await this.panel.getByRole('switch', { name: label }).check();
  }
}

export class DocsHome {
  readonly title: Locator;
  readonly start: Locator;
  readonly copyInstall: Locator;
  readonly nameInput: Locator;
  readonly periods: Locator;
  readonly facts: Locator;

  constructor(page: Page) {
    this.title = page.getByRole('heading', { level: 1 });
    this.start = page.getByRole('link', { name: 'Начать', exact: true });
    this.copyInstall = page.getByRole('button', { name: 'Скопировать код' });
    this.nameInput = page.getByRole('textbox', { name: 'Название' });
    this.periods = page.getByRole('group', { name: 'Период' });
    this.facts = page.getByRole('region', { name: 'Коротко о наборе' });
  }

  period(label: string): Locator {
    return this.periods.getByRole('radio', { name: label, exact: true });
  }
}

export class DocsSite {
  readonly header: Locator;
  readonly sidebar: Locator;
  readonly drawer: Locator;
  readonly trigger: Locator;
  readonly toc: Locator;
  readonly article: Locator;
  readonly searchButton: Locator;
  readonly themeButton: Locator;
  readonly languageButton: Locator;
  readonly commandDialog: Locator;
  readonly commandInput: Locator;

  constructor(readonly page: Page) {
    this.header = page.locator('.nui-app-bar');
    this.sidebar = page.locator('aside.nui-sidebar');
    this.drawer = page.locator('dialog.nui-sidebar-drawer');
    this.trigger = page.locator('.nui-sidebar-trigger');
    this.toc = page.locator('nav.nui-toc');
    this.article = page.locator('#docs-content');
    this.searchButton = this.header.getByRole('button', { name: /Поиск|Search/ });
    this.themeButton = this.header.getByRole('button', { name: /^(Тема|Theme)$/ });
    this.languageButton = this.header.getByRole('button', { name: /^(Язык|Language)$/ });
    this.commandDialog = page.locator('.nui-command-dialog');
    this.commandInput = this.commandDialog.locator('.nui-command__input');
  }

  async open(path: string, scheme?: DocsScheme): Promise<void> {
    if (scheme !== undefined) {
      await this.page.addInitScript((value) => localStorage.setItem('nui-theme', value), scheme);
    }
    await this.page.goto(path, { waitUntil: 'networkidle' });
    await this.page.locator('.nui-layout:not(.nui-layout--pending)').first().waitFor();
  }

  get heading(): Locator {
    return this.article.getByRole('heading', { level: 1 });
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

  async pickTheme(name: string): Promise<void> {
    await this.themeButton.click();
    await this.page.getByRole('menuitemradio', { name }).click();
  }

  async pickLanguage(name: string): Promise<void> {
    await this.languageButton.click();
    await this.page.getByRole('menuitem', { name }).click();
  }

  async scrollTo(id: string): Promise<void> {
    await this.page.locator(`#${id}`).evaluate((element) => {
      element.scrollIntoView({ block: 'start' });
    });
  }

  scheme(): Promise<string | null> {
    return this.page.locator('html').getAttribute('data-nui-theme');
  }

  example(previewLabel = 'Превью'): DocsExample {
    return new DocsExample(this.page, previewLabel);
  }

  configurator(): DocsConfigurator {
    return new DocsConfigurator(this.page);
  }

  home(): DocsHome {
    return new DocsHome(this.page);
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

  async wcagViolations() {
    const results = await new AxeBuilder({ page: this.page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    return results.violations;
  }
}
