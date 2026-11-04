import type { Locator, Page } from '@playwright/test';
import {
  isNumber,
  isString,
  nullable,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';
import { sectionScope } from '../helpers/axe';

export type WizardOutput = Guarded<typeof isWizardOutput>;

export type WizardStep = 'Аккаунт' | 'Команда' | 'Подтверждение';

const isWizardOutput = shapeOf({ step: isString, submitted: isNumber, team: nullable(isString) });

const parseWizardOutput = (text: string): WizardOutput =>
  parseAs(text, isWizardOutput, 'wizard output');

const FIELD = 'xpath=ancestor::*[contains(concat(" ", @class, " "), " nui-field ")][1]';

export class WizardSection {
  readonly scope = sectionScope('wizard');

  readonly form: Locator;
  readonly stepper: Locator;
  readonly summary: Locator;
  readonly next: Locator;
  readonly back: Locator;
  readonly create: Locator;
  readonly rules: Locator;
  readonly live: Locator;
  readonly output: Locator;

  constructor(page: Page) {
    this.form = page.getByTestId('wizard-form');
    this.stepper = this.form.locator('.nui-stepper');
    this.summary = this.stepper.locator('.nui-stepper__summary');
    this.next = this.form.getByRole('button', { name: 'Далее' });
    this.back = this.form.getByRole('button', { name: 'Назад' });
    this.create = this.form.getByRole('button', { name: 'Создать команду' });
    this.rules = this.form.getByRole('checkbox', { name: 'Согласен с правилами команды' });
    this.live = this.form.locator('.nui-smart-form__live');
    this.output = page.getByTestId('wizard-output');
  }

  control(path: string): Locator {
    return this.form.locator(`[name="${path}"]`);
  }

  panel(step: WizardStep): Locator {
    return this.form.getByRole('group', { name: step, exact: true });
  }

  stepItem(step: WizardStep): Locator {
    return this.stepper.locator('.nui-stepper__item', { hasText: step });
  }

  stepButton(step: WizardStep): Locator {
    return this.stepItem(step).locator('button.nui-stepper__step');
  }

  errorOf(control: Locator): Locator {
    return control.locator(FIELD).locator('.nui-field__error');
  }

  async fillAccount(email = 'ann@example.com'): Promise<void> {
    await this.control('email').fill(email);
    await this.control('password').fill('long enough');
  }

  async reachConfirmation(email?: string): Promise<void> {
    await this.fillAccount(email);
    await this.next.click();
    await this.control('team').fill('Numior');
    await this.next.click();
  }

  async readOutput(): Promise<WizardOutput> {
    return parseWizardOutput(await this.output.innerText());
  }
}
