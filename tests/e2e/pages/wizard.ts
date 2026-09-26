import type { Locator, Page } from '@playwright/test';

export interface WizardOutput {
  readonly step: string;
  readonly submitted: number;
  readonly team: string | null;
}

export type WizardStep = 'Аккаунт' | 'Команда' | 'Подтверждение';

const FIELD = 'xpath=ancestor::*[contains(concat(" ", @class, " "), " nui-field ")][1]';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isWizardOutput = (
  data: Record<string, unknown>,
): data is Record<string, unknown> & WizardOutput =>
  typeof data.step === 'string' &&
  typeof data.submitted === 'number' &&
  (data.team === null || typeof data.team === 'string');

const parseWizardOutput = (text: string): WizardOutput => {
  const data: unknown = JSON.parse(text);

  if (!isRecord(data) || !isWizardOutput(data)) {
    throw new Error(`Unexpected wizard output: ${text}`);
  }
  return data;
};

export class WizardSection {
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
