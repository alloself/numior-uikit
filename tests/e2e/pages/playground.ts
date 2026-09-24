import { AxeBuilder } from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { DataSection } from './data';
import { FeedbackSection } from './feedback';
import { IntlSection } from './intl';
import { NavigationSection } from './navigation';
import { OverlaysSection } from './overlays';
import { PickersSection } from './pickers';
import { TableSection } from './table';
import { TreeSection } from './tree';

export type Theme = 'system' | 'light' | 'dark';
export type Accent = 'indigo' | 'emerald' | 'rose';
export type Density = 'comfortable' | 'compact';
export type Direction = 'ltr' | 'rtl';

export interface FormsOutput {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly bio: string;
  readonly terms: boolean;
  readonly channels: string[];
  readonly plan: string;
  readonly notifications: boolean;
  readonly submitted: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isString = (value: unknown): value is string => typeof value === 'string';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isNumber = (value: unknown): value is number => typeof value === 'number';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

const field = <T>(
  data: Record<string, unknown>,
  key: string,
  guard: (value: unknown) => value is T,
): T => {
  const value = data[key];
  if (!guard(value)) {
    throw new Error(`Unexpected ${key} in forms output: ${String(value)}`);
  }
  return value;
};

const parseFormsOutput = (text: string): FormsOutput => {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data)) {
    throw new Error('Forms output is not an object');
  }
  return {
    name: field(data, 'name', isString),
    email: field(data, 'email', isString),
    phone: field(data, 'phone', isString),
    bio: field(data, 'bio', isString),
    terms: field(data, 'terms', isBoolean),
    channels: field(data, 'channels', isStringArray),
    plan: field(data, 'plan', isString),
    notifications: field(data, 'notifications', isBoolean),
    submitted: field(data, 'submitted', isNumber),
  };
};

export class FormsSection {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly bio: Locator;
  readonly largeInput: Locator;
  readonly terms: Locator;
  readonly indeterminate: Locator;
  readonly channelEmail: Locator;
  readonly channelSms: Locator;
  readonly radioGroup: Locator;
  readonly radios: { readonly free: Locator; readonly team: Locator; readonly business: Locator };
  readonly notifications: Locator;
  readonly submit: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.nameInput = page.getByTestId('input-name');
    this.emailInput = page.getByTestId('input-email');
    this.phoneInput = page.getByTestId('input-phone');
    this.bio = page.getByTestId('textarea-bio');
    this.largeInput = page.getByTestId('input-lg');
    this.terms = page.getByTestId('checkbox-terms');
    this.indeterminate = page.getByTestId('checkbox-indeterminate');
    this.channelEmail = page.getByTestId('checkbox-channel-email');
    this.channelSms = page.getByTestId('checkbox-channel-sms');
    this.radioGroup = page.getByTestId('radio-group');

    this.radios = {
      free: page.getByTestId('radio-free'),
      team: page.getByTestId('radio-team'),
      business: page.getByTestId('radio-business'),
    };

    this.notifications = page.getByTestId('switch-notifications');
    this.submit = page.getByTestId('submit');
    this.output = page.getByTestId('forms-output');
  }

  label(text: string): Locator {
    return this.page.locator('label', { hasText: text });
  }

  wrapperOf(control: Locator): Locator {
    return control.locator('..');
  }

  async readOutput(): Promise<FormsOutput> {
    return parseFormsOutput(await this.output.innerText());
  }
}

export class PlaygroundPage {
  readonly workspace: Locator;
  readonly resolvedScheme: Locator;
  readonly clickCount: Locator;
  readonly settings: {
    readonly theme: Locator;
    readonly accent: Locator;
    readonly density: Locator;
    readonly direction: Locator;
  };

  readonly buttons: {
    readonly primary: Locator;
    readonly loading: Locator;
    readonly loadingToggle: Locator;
    readonly nested: Locator;
    readonly large: Locator;
  };

  readonly swatches: { readonly utility: Locator; readonly tailwind: Locator };
  readonly forms: FormsSection;
  readonly overlays: OverlaysSection;
  readonly feedback: FeedbackSection;
  readonly navigation: NavigationSection;
  readonly pickers: PickersSection;
  readonly intl: IntlSection;
  readonly data: DataSection;
  readonly tree: TreeSection;
  readonly table: TableSection;

  constructor(readonly page: Page) {
    this.workspace = page.getByRole('main');
    this.resolvedScheme = page.getByTestId('resolved-scheme');
    this.clickCount = page.getByRole('status');

    this.settings = {
      theme: page.getByTestId('theme'),
      accent: page.getByTestId('accent'),
      density: page.getByTestId('density'),
      direction: page.getByTestId('direction'),
    };

    this.buttons = {
      primary: page.getByTestId('primary'),
      loading: page.getByTestId('loading'),
      loadingToggle: page.getByTestId('loading-toggle'),
      nested: page.getByTestId('nested'),
      large: page.getByTestId('large'),
    };

    this.swatches = {
      utility: page.getByTestId('utility'),
      tailwind: page.getByTestId('tailwind'),
    };

    this.forms = new FormsSection(page);
    this.overlays = new OverlaysSection(page);
    this.feedback = new FeedbackSection(page);
    this.navigation = new NavigationSection(page);
    this.pickers = new PickersSection(page);
    this.intl = new IntlSection(page);
    this.data = new DataSection(page);
    this.tree = new TreeSection(page);
    this.table = new TableSection(page);
  }

  async open(path: '/' | '/tailwind.html' = '/'): Promise<void> {
    await this.page.goto(path);
  }

  async emulate(options: {
    colorScheme?: 'light' | 'dark';
    reducedMotion?: 'reduce' | 'no-preference';
  }): Promise<void> {
    await this.page.emulateMedia(options);
  }

  async setTheme(theme: Theme): Promise<void> {
    await this.settings.theme.selectOption(theme);
  }

  async setAccent(accent: Accent): Promise<void> {
    await this.settings.accent.selectOption(accent);
  }

  async setDensity(density: Density): Promise<void> {
    await this.settings.density.selectOption(density);
  }

  async setDirection(direction: Direction): Promise<void> {
    await this.settings.direction.selectOption(direction);
  }

  hasHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  }

  async wcagViolations() {
    const results = await new AxeBuilder({ page: this.page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    return results.violations;
  }
}
