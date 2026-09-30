import type { Locator, Page } from '@playwright/test';
import { boxOf, type Box } from '../helpers/geometry';
import {
  isString,
  listOf,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';

const isOtpOutput = shapeOf({
  sms: isString,
  state: isString,
  completed: listOf(isString),
  access: isString,
  pin: isString,
  spare: isString,
});

export type OtpOutput = Guarded<typeof isOtpOutput>;

const parseOtpOutput = (text: string): OtpOutput => parseAs(text, isOtpOutput, 'otp output');

const FIELD_ROOT = 'xpath=ancestor::*[contains(concat(" ", @class, " "), " nui-otp-field ")][1]';

export class OtpSection {
  readonly sms: Locator;
  readonly access: Locator;
  readonly pin: Locator;
  readonly spare: Locator;
  readonly readonlyCode: Locator;
  readonly resend: Locator;
  readonly output: Locator;
  private readonly root: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('section[aria-labelledby="otp-title"]');
    this.sms = page.getByTestId('otp-sms');
    this.access = page.getByTestId('otp-access');
    this.pin = page.getByTestId('otp-pin');
    this.spare = page.getByTestId('otp-spare');
    this.readonlyCode = page.getByTestId('otp-readonly');
    this.resend = page.getByTestId('otp-resend');
    this.output = page.getByTestId('otp-output');
  }

  static async stubWebOtp(page: Page, code: string): Promise<void> {
    await page.addInitScript((received) => {
      Object.defineProperty(window, 'OTPCredential', { configurable: true, value: Object });

      Object.defineProperty(navigator, 'credentials', {
        configurable: true,
        value: {
          get: (): Promise<unknown> =>
            new Promise((resolve) => {
              setTimeout(() => resolve({ id: '', type: 'otp', code: received }), 300);
            }),
        },
      });
    }, code);
  }

  rootOf(control: Locator): Locator {
    return control.locator(FIELD_ROOT);
  }

  slotsOf(control: Locator): Locator {
    return this.rootOf(control).locator('.nui-otp-field__slot');
  }

  slotOf(control: Locator, index: number): Locator {
    return this.slotsOf(control).nth(index);
  }

  caretOf(control: Locator): Locator {
    return this.rootOf(control).locator('.nui-otp-field__caret');
  }

  errorOf(control: Locator): Locator {
    return control
      .locator('xpath=ancestor::*[contains(@class, "nui-field")][1]')
      .locator('.nui-field__error');
  }

  slotTexts(control: Locator): Promise<string[]> {
    return this.slotsOf(control).evaluateAll((slots) =>
      slots.map((slot) => slot.querySelector('.nui-otp-field__char')?.textContent?.trim() ?? ''),
    );
  }

  activeSlots(control: Locator): Promise<number[]> {
    return this.slotsOf(control).evaluateAll((slots) =>
      slots.flatMap((slot, index) =>
        slot.classList.contains('nui-otp-field__slot--active') ? [index] : [],
      ),
    );
  }

  revealedSlots(control: Locator): Promise<number[]> {
    return this.slotsOf(control).evaluateAll((slots) =>
      slots.flatMap((slot, index) =>
        slot.classList.contains('nui-otp-field__slot--revealed') ? [index] : [],
      ),
    );
  }

  dots(control: Locator): Locator {
    return this.rootOf(control).locator('.nui-otp-field__dot');
  }

  slotBoxes(control: Locator): Promise<Box[]> {
    return this.slotsOf(control).evaluateAll((slots) =>
      slots.map((slot) => {
        const { x, y, width, height } = slot.getBoundingClientRect();

        return { x, y, width, height };
      }),
    );
  }

  async clickSlot(control: Locator, index: number): Promise<void> {
    const slot = this.slotOf(control, index);

    await slot.scrollIntoViewIfNeeded();
    const box = await boxOf(slot);
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }

  async paste(control: Locator, text: string): Promise<void> {
    await control.evaluate((element, pasted) => {
      const data = new DataTransfer();
      const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });

      data.setData('text/plain', pasted);
      Object.defineProperty(event, 'clipboardData', { value: data });
      element.dispatchEvent(event);
    }, text);
  }

  overflows(): Promise<boolean> {
    return this.root.evaluate((section) => section.scrollWidth > section.clientWidth);
  }

  async readOutput(): Promise<OtpOutput> {
    return parseOtpOutput(await this.output.innerText());
  }
}
