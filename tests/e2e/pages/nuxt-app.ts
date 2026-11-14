import type { Locator, Page } from '@playwright/test';
import { wcagViolationsOf, type AxeViolations } from '../helpers/axe';
import { schemeOf } from '../helpers/theme';

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
  readonly styledPage: Locator;
  readonly themed: Locator;
  readonly restyled: Locator;
  readonly track: Locator;
  readonly swatch: Locator;
  private readonly console: string[] = [];

  constructor(private readonly page: Page) {
    this.home = page.getByTestId('home');
    this.aboutPage = page.getByTestId('about-page');
    this.install = page.getByTestId('install');
    this.about = page.getByTestId('about');
    this.back = page.getByTestId('back');
    this.notify = page.getByTestId('notify');
    this.toasts = page.locator('.nui-toaster__item');
    this.styledPage = page.getByTestId('styled-page');
    this.themed = page.getByTestId('themed');
    this.restyled = page.getByTestId('restyled');
    this.track = page.getByTestId('track');
    this.swatch = page.getByTestId('swatch');

    page.on('console', (message) => {
      if (message.type() !== 'warning' && message.type() !== 'error') {
        return;
      }

      this.console.push(message.text());
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
    return schemeOf(this.page.locator('html'));
  }

  async rootClasses(): Promise<string[]> {
    return ((await this.page.locator('html').getAttribute('class')) ?? '').split(/\s+/u).toSorted();
  }

  async mark(): Promise<void> {
    await this.page.evaluate(() => {
      document.documentElement.dataset.reloadMark = 'kept';
    });
  }

  marked(): Promise<string | null> {
    return this.page.locator('html').getAttribute('data-reload-mark');
  }

  styleOf(target: Locator, property: string): Promise<string> {
    return target.evaluate((element, name) => {
      return getComputedStyle(element).getPropertyValue(name);
    }, property);
  }

  wcagViolations(): Promise<AxeViolations> {
    return wcagViolationsOf(this.page);
  }
}
