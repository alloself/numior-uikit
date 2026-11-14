import type { Locator, Page } from '@playwright/test';
import { sectionScope, wcagViolationsOf, type AxeViolations } from '../helpers/axe';
import {
  hideLayer,
  kitPixelsOf,
  motionSettled,
  offPixel,
  showLayer,
  type KitPixels,
} from '../helpers/pixels';
import { DataSection } from './data';
import { DatesSection } from './dates';
import { FeedbackSection } from './feedback';
import { IntlSection } from './intl';
import { NavigationSection } from './navigation';
import { OtpSection } from './otp';
import { OverlaysSection } from './overlays';
import { PickersSection } from './pickers';
import { SignupSection } from './signup';
import { SmartFormSection } from './smart-form';
import { TableSection } from './table';
import { TableDetailSection } from './table-detail';
import { TableSheetSection } from './table-sheet';
import { TableCellsSection } from './table-cells';
import { TableFlowSection } from './table-flow';
import { TreeSection } from './tree';
import { ChartsSection } from './charts';
import { BookSection } from './book';
import { UploadSection } from './upload';
import { WizardSection } from './wizard';
import { LayoutSection } from './layout';
import { TypographySection } from './typography';
import { ChromeSection } from './chrome';
import { EditorSection } from './editor';
import {
  isBoolean,
  isNumber,
  isString,
  listOf,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';

export type FormsOutput = Guarded<typeof isFormsOutput>;

export type Theme = 'system' | 'light' | 'dark';

export type Accent =
  | 'indigo'
  | 'blue'
  | 'violet'
  | 'emerald'
  | 'teal'
  | 'rose'
  | 'orange'
  | 'amber'
  | 'slate';

export type Density = 'comfortable' | 'compact';

export type Direction = 'ltr' | 'rtl';

const isFormsOutput = shapeOf({
  name: isString,
  email: isString,
  phone: isString,
  bio: isString,
  terms: isBoolean,
  channels: listOf(isString),
  plan: isString,
  notifications: isBoolean,
  submitted: isNumber,
});

const parseFormsOutput = (text: string): FormsOutput =>
  parseAs(text, isFormsOutput, 'forms output');

export class FormsSection {
  readonly scope = sectionScope('forms');

  readonly root: Locator;
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

  constructor(page: Page) {
    this.root = page.locator('section[aria-labelledby="forms-title"]');
    this.nameInput = page.getByTestId('input-name');
    this.emailInput = page.getByTestId('input-email');
    this.phoneInput = page.getByTestId('input-phone');
    this.bio = page.getByTestId('textarea-bio');
    this.largeInput = page.getByTestId('input-lg');
    this.terms = page.getByTestId('checkbox-terms');
    this.indeterminate = page.getByTestId('checkbox-indeterminate');

    this.channelEmail = page
      .getByTestId('checkbox-channels')
      .getByRole('checkbox', { name: 'Почта' });

    this.channelSms = page.getByTestId('checkbox-channels').getByRole('checkbox', { name: 'SMS' });
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
    return this.root.locator('label', { hasText: text });
  }

  wrapperOf(control: Locator): Locator {
    return control.locator('..');
  }

  fieldOf(control: Locator): Locator {
    return control.locator(
      'xpath=ancestor::*[contains(concat(" ", @class, " "), " nui-field ")][1]',
    );
  }

  async readOutput(): Promise<FormsOutput> {
    return parseFormsOutput(await this.output.innerText());
  }
}

const CLICKABLE_CONTROLS = [
  'button:not(:disabled)',
  'a[href]',
  'select:not(:disabled)',
  'input[type="checkbox"]:not(:disabled)',
  'input[type="radio"]:not(:disabled)',
  '[role="option"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="treeitem"]',
].join(', ');

const ZOOM_CONTROLS = '.nui-content__zoom';

const DRAG_GRIPS = '.nui-table__row-grip, .nui-button--grip';

const LAYERS = '[popover], dialog';

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
    readonly link: Locator;
  };

  readonly tailwindSwatch: Locator;
  readonly variantSwatch: Locator;
  readonly nestedScope: Locator;
  readonly nestedVariant: Locator;
  readonly nestedLight: Locator;
  readonly nestedLightButton: Locator;
  readonly nestedLightVariant: Locator;
  readonly typography: TypographySection;
  readonly chrome: ChromeSection;
  readonly forms: FormsSection;
  readonly signup: SignupSection;
  readonly otp: OtpSection;
  readonly smartForm: SmartFormSection;
  readonly wizard: WizardSection;
  readonly overlays: OverlaysSection;
  readonly feedback: FeedbackSection;
  readonly navigation: NavigationSection;
  readonly pickers: PickersSection;
  readonly intl: IntlSection;
  readonly dates: DatesSection;
  readonly upload: UploadSection;
  readonly layout: LayoutSection;
  readonly data: DataSection;
  readonly tree: TreeSection;
  readonly charts: ChartsSection;
  readonly book: BookSection;
  readonly table: TableSection;
  readonly tableDetail: TableDetailSection;
  readonly tableSheet: TableSheetSection;
  readonly tableCells: TableCellsSection;
  readonly formulas: BookSection;
  readonly tableFlow: TableFlowSection;
  readonly editor: EditorSection;

  constructor(readonly page: Page) {
    this.workspace = page.getByRole('main');
    this.resolvedScheme = page.getByTestId('resolved-scheme');
    this.clickCount = page.getByRole('status').filter({ hasText: 'Нажатий' });

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
      link: page.getByTestId('link-button'),
    };

    this.tailwindSwatch = page.getByTestId('tailwind');
    this.variantSwatch = page.getByTestId('variant');
    this.nestedScope = page.locator('section.nested-theme');
    this.nestedVariant = page.getByTestId('nested-variant');
    this.nestedLight = page.getByTestId('nested-light');
    this.nestedLightButton = page.getByTestId('nested-light-button');
    this.nestedLightVariant = page.getByTestId('nested-light-variant');

    this.typography = new TypographySection(page);
    this.chrome = new ChromeSection(page);
    this.forms = new FormsSection(page);
    this.signup = new SignupSection(page);
    this.otp = new OtpSection(page);
    this.smartForm = new SmartFormSection(page);
    this.wizard = new WizardSection(page);
    this.overlays = new OverlaysSection(page);
    this.feedback = new FeedbackSection(page);
    this.navigation = new NavigationSection(page);
    this.pickers = new PickersSection(page);
    this.intl = new IntlSection(page);
    this.dates = new DatesSection(page);
    this.upload = new UploadSection(page);
    this.layout = new LayoutSection(page);
    this.data = new DataSection(page);
    this.tree = new TreeSection(page);
    this.charts = new ChartsSection(page);
    this.book = new BookSection(page);
    this.table = new TableSection(page);
    this.tableDetail = new TableDetailSection(page);
    this.tableSheet = new TableSheetSection(page);
    this.tableCells = new TableCellsSection(page);
    this.formulas = new BookSection(page, 'formulas');
    this.tableFlow = new TableFlowSection(page);
    this.editor = new EditorSection(page);
  }

  async open(path: '/' = '/'): Promise<void> {
    await this.page.goto(path);
  }

  async emulate(options: {
    colorScheme?: 'light' | 'dark';
    reducedMotion?: 'reduce' | 'no-preference';
  }): Promise<void> {
    await this.page.emulateMedia(options);
  }

  async resize(size: { width: number; height: number }): Promise<void> {
    await this.page.setViewportSize(size);
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

  controlsWithoutPointer(): Promise<string[]> {
    return this.page.evaluate(
      ({ selector, grips, zooms }) =>
        [...document.querySelectorAll(selector)].flatMap((element) => {
          const cursor = getComputedStyle(element).cursor;

          const expected = element.matches(grips)
            ? 'grab'
            : element.matches(zooms)
              ? 'zoom-in'
              : 'pointer';

          const inert =
            element.closest('[aria-disabled="true"]') !== null ||
            element.getAttribute('aria-current') === 'step';

          return inert || cursor === expected
            ? []
            : [`${element.tagName.toLowerCase()}.${element.className} → ${cursor}`];
        }),
      { selector: CLICKABLE_CONTROLS, grips: DRAG_GRIPS, zooms: ZOOM_CONTROLS },
    );
  }

  async offPixelParts(): Promise<string[]> {
    await motionSettled(this.page);

    const measured: KitPixels[] = [await kitPixelsOf(this.page.locator('body'))];

    for (const layer of await this.page.locator(LAYERS).all()) {
      if (!(await showLayer(layer))) {
        continue;
      }

      measured.push(await kitPixelsOf(layer));

      await hideLayer(layer);
    }

    return offPixel({
      boxes: measured.flatMap((part) => part.boxes),
      lines: measured.flatMap((part) => part.lines),
    });
  }

  hasHorizontalOverflow(): Promise<boolean> {
    return this.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  }

  wcagViolations(scope?: string): Promise<AxeViolations> {
    return wcagViolationsOf(this.page, scope);
  }
}
