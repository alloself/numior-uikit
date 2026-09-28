import { AxeBuilder } from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

export type NuxtScheme = 'light' | 'dark' | 'system';

const HYDRATION = /hydrat|mismatch/i;

export class NuxtApp {
  readonly home: Locator;
  readonly aboutPage: Locator;
  readonly install: Locator;
  readonly about: Locator;
  readonly back: Locator;
  readonly notify: Locator;
  readonly toasts: Locator;
  private readonly console: string[] = [];

  constructor(private readonly page: Page) {
    this.home = page.getByTestId('home');
    this.aboutPage = page.getByTestId('about-page');
    this.install = page.getByTestId('install');
    this.about = page.getByTestId('about');
    this.back = page.getByTestId('back');
    this.notify = page.getByTestId('notify');
    this.toasts = page.locator('.nui-toaster__item');

    page.on('console', (message) => {
      if (message.type() === 'warning' || message.type() === 'error') {
        this.console.push(message.text());
      }
    });

    page.on('pageerror', (error) => {
      this.console.push(error.message);
    });
  }

  async open(path: string, scheme?: NuxtScheme): Promise<void> {
    if (scheme !== undefined) {
      await this.page.addInitScript((value) => {
        localStorage.setItem('nui-theme', value);
      }, scheme);
    }
    await this.page.goto(path);
  }

  get hydrationProblems(): string[] {
    return this.console.filter((text) => HYDRATION.test(text));
  }

  get errors(): string[] {
    return this.console;
  }

  theme(): Promise<string | null> {
    return this.page.locator('html').getAttribute('data-nui-theme');
  }

  async mark(): Promise<void> {
    await this.page.evaluate(() => {
      document.documentElement.dataset.nuiMark = 'kept';
    });
  }

  marked(): Promise<string | null> {
    return this.page.locator('html').getAttribute('data-nui-mark');
  }

  async wcagViolations() {
    const results = await new AxeBuilder({ page: this.page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    return results.violations;
  }
}
