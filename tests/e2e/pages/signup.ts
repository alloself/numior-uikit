import type { Locator, Page } from '@playwright/test';
import {
  isBoolean,
  isNumber,
  isString,
  listOf,
  nullable,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';

export type SignupOutput = Guarded<typeof isSignupOutput>;

export type ServerAnswer = 'Успех' | 'Ошибка поля' | 'Ошибка формы' | 'Медленный ответ';

const isSignupOutput = shapeOf({
  submitted: isNumber,
  submitCount: isNumber,
  dirty: isBoolean,
  pending: isBoolean,
  formErrors: listOf(isString),
  seats: nullable(isNumber),
  tags: listOf(isString),
  about: isString,
});

const parseSignupOutput = (text: string): SignupOutput =>
  parseAs(text, isSignupOutput, 'signup output');

const FIELD = 'xpath=ancestor::*[contains(concat(" ", @class, " "), " nui-field ")][1]';

const CHECKBOX_BOX = 'xpath=following-sibling::*[contains(@class, "nui-checkbox__box")][1]';

export class SignupSection {
  readonly form: Locator;
  readonly server: Locator;
  readonly reserve: Locator;
  readonly login: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly confirm: Locator;
  readonly seats: Locator;
  readonly tags: Locator;
  readonly call: Locator;
  readonly about: Locator;
  readonly terms: Locator;
  readonly submit: Locator;
  readonly reset: Locator;
  readonly alert: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.form = page.getByTestId('signup-form');
    this.server = page.getByTestId('signup-server');
    this.reserve = page.getByTestId('signup-reserve');
    this.login = page.getByTestId('signup-login');
    this.email = page.getByTestId('signup-email');
    this.password = page.getByTestId('signup-password');
    this.confirm = page.getByTestId('signup-confirm');
    this.seats = page.getByTestId('signup-seats');
    this.tags = page.getByTestId('signup-tags');
    this.call = page.getByTestId('signup-call');
    this.about = page.getByTestId('signup-about');
    this.terms = page.getByTestId('signup-terms');
    this.submit = page.getByTestId('signup-submit');
    this.reset = page.getByTestId('signup-reset');
    this.alert = this.form.locator('.nui-form__errors');
    this.output = page.getByTestId('signup-output');
  }

  get listbox(): Locator {
    return this.page.getByRole('listbox').and(this.page.locator('.nui-list--variant-floating'));
  }

  option(label: string): Locator {
    return this.listbox.getByRole('option', { name: label });
  }

  fieldOf(control: Locator): Locator {
    return control.locator(FIELD);
  }

  frameOf(control: Locator): Locator {
    return control.locator('..');
  }

  checkboxBoxOf(checkbox: Locator): Locator {
    return checkbox.locator(CHECKBOX_BOX);
  }

  errorOf(control: Locator): Locator {
    return this.fieldOf(control).locator('.nui-field__error');
  }

  checkingOf(control: Locator): Locator {
    return this.fieldOf(control).locator('.form-demo__spinner');
  }

  chipsOf(combobox: Locator): Locator {
    return this.fieldOf(combobox).locator('.nui-chip__label');
  }

  segmentsOf(group: Locator): Locator {
    return group.getByRole('spinbutton');
  }

  async answer(label: ServerAnswer): Promise<void> {
    await this.server.click();
    await this.option(label).click();
  }

  async fillAccount(): Promise<void> {
    await this.login.fill('annie');
    await this.email.fill('ann@example.com');
    await this.password.fill('long enough');
    await this.confirm.fill('long enough');
  }

  async fillValid(): Promise<void> {
    await this.fillAccount();
    await this.terms.check();
  }

  isFocusVisible(target: Locator): Promise<boolean> {
    return target.evaluate((element) => element.matches(':focus-visible'));
  }

  async readOutput(): Promise<SignupOutput> {
    return parseSignupOutput(await this.output.innerText());
  }
}
