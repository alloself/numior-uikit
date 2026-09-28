import type { Locator, Page } from '@playwright/test';
import {
  isRecord,
  isString,
  nullable,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';
import { boxOf, type Point } from '../helpers/geometry';

const isSmartFormOutput = shapeOf({
  filter: shapeOf({ query: isString, status: nullable(isString) }),
  profile: nullable(isRecord),
});

export type SmartFormOutput = Guarded<typeof isSmartFormOutput>;

const parseSmartFormOutput = (text: string): SmartFormOutput =>
  parseAs(text, isSmartFormOutput, 'smart form output');

const FIELD = 'xpath=ancestor::*[contains(concat(" ", @class, " "), " nui-field ")][1]';

export type KindLabel = 'Частное лицо' | 'Компания';

export interface KindSwitchMotion {
  readonly before: number;
  readonly after: number;
  readonly slid: boolean;
  readonly faded: boolean;
  readonly drift: number;
  readonly spill: number;
  readonly companyAfter: boolean;
}

export class SmartFormSection {
  readonly filter: Locator;
  readonly profile: Locator;
  readonly search: Locator;
  readonly status: Locator;
  readonly find: Locator;
  readonly save: Locator;
  readonly addContact: Locator;
  readonly contacts: Locator;
  readonly contactNames: Locator;
  readonly live: Locator;
  readonly limit: Locator;
  readonly ghost: Locator;
  readonly indicator: Locator;
  readonly counter: Locator;
  readonly newsletter: Locator;
  readonly readonlyToggle: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.filter = page.getByTestId('smart-filter');
    this.profile = page.getByTestId('smart-profile');
    this.search = this.filter.getByRole('searchbox', { name: 'Поиск' });
    this.status = this.filter.getByRole('combobox', { name: 'Статус' });
    this.find = this.filter.getByRole('button', { name: 'Найти' });
    this.save = this.profile.getByRole('button', { name: 'Сохранить профиль' });
    this.addContact = this.profile.getByRole('button', { name: 'Добавить контакт' });

    this.contacts = this.profile.locator(
      '.nui-field-array__row:not(.nui-field-array__row--leaving)',
    );

    this.contactNames = this.contacts.locator('input[name$=".name"]');
    this.live = this.profile.locator('.nui-field-array__live');
    this.limit = this.profile.locator('.nui-field-array__limit');
    this.ghost = this.profile.locator('.nui-field-array__ghost');
    this.indicator = this.profile.locator('.nui-field-array__indicator');
    this.counter = page.getByTestId('smart-about-counter');

    this.newsletter = this.profile.getByRole('checkbox', {
      name: 'Присылать новости раз в месяц',
    });

    this.readonlyToggle = page.getByTestId('smart-readonly');
    this.output = page.getByTestId('smart-output');
  }

  get listbox(): Locator {
    return this.page.getByRole('listbox').and(this.page.locator('.nui-list--variant-floating'));
  }

  option(label: string): Locator {
    return this.listbox.getByRole('option', { name: label });
  }

  control(path: string): Locator {
    return this.profile.locator(`[name="${path}"]`);
  }

  kind(label: KindLabel): Locator {
    return this.profile.getByRole('radio', { name: label });
  }

  async slowDownMotion(): Promise<void> {
    await this.profile.evaluate((root) => {
      root.style.setProperty('--nui-duration-normal', '1s');
    });
  }

  switchKindWatchingLayout(label: KindLabel): Promise<KindSwitchMotion> {
    return this.profile.evaluate(async (root, text) => {
      const topOf = (name: string): number =>
        root.querySelector(`[name="${name}"]`)?.getBoundingClientRect().top ?? 0;

      const companyOpacity = (): number | undefined => {
        const cell = root.querySelector('[name="company"]')?.closest('.nui-smart-form__cell');
        return cell ? Number(getComputedStyle(cell).opacity) : undefined;
      };

      const spillOf = (): number => {
        const grid = root.querySelector('[name="name"]')?.closest('.nui-smart-form__grid');

        if (!grid || getComputedStyle(grid).clipPath !== 'none') {
          return 0;
        }

        const edge = grid.getBoundingClientRect().bottom;
        const bottoms = [...grid.children].map((cell) => cell.getBoundingClientRect().bottom);
        return Math.max(0, ...bottoms.map((bottom) => bottom - edge));
      };

      const radio = [...root.querySelectorAll('input[type="radio"]')].find(
        (input) => input.closest('label')?.textContent?.includes(text) === true,
      );

      const before = topOf('city');
      const anchor = topOf('name');
      const cities: number[] = [];
      const opacities: number[] = [];
      const state = { drift: 0, spill: 0 };

      if (radio instanceof HTMLElement) {
        radio.click();
      }

      await new Promise<void>((resolve) => {
        const started = performance.now();

        const sample = (): void => {
          cities.push(topOf('city'));
          opacities.push(companyOpacity() ?? 1);
          state.drift = Math.max(state.drift, Math.abs(topOf('name') - anchor));
          state.spill = Math.max(state.spill, spillOf());

          if (performance.now() - started < 1400) {
            requestAnimationFrame(sample);
          } else {
            resolve();
          }
        };

        requestAnimationFrame(sample);
      });

      const after = topOf('city');
      const low = Math.min(before, after) + 2;
      const high = Math.max(before, after) - 2;

      return {
        before,
        after,
        slid: cities.some((top) => top > low && top < high),
        faded: opacities.some((opacity) => opacity > 0.05 && opacity < 0.95),
        drift: state.drift,
        spill: state.spill,
        companyAfter: root.querySelector('[name="company"]') !== null,
      };
    }, label);
  }

  section(title: string): Locator {
    return this.profile.locator('.nui-smart-form__section', {
      has: this.page.locator('.nui-smart-form__legend', { hasText: title }),
    });
  }

  legendOf(section: Locator): Locator {
    return section.locator('.nui-smart-form__legend').first();
  }

  errorOf(control: Locator): Locator {
    return control.locator(FIELD).locator('.nui-field__error');
  }

  grip(row: number): Locator {
    return this.profile.getByRole('button', { name: `Переместить строку ${row}` });
  }

  remove(row: number): Locator {
    return this.profile.getByRole('button', { name: `Удалить строку ${row}` });
  }

  names(): Promise<string[]> {
    return this.contactNames.evaluateAll((inputs) =>
      inputs.map((input) => (input instanceof HTMLInputElement ? input.value : '')),
    );
  }

  async fillRequired(): Promise<void> {
    await this.control('name').fill('Анна');
    await this.control('email').fill('ann@example.com');
    await this.control('contacts.0.name').fill('Борис');
  }

  async dragContact(from: number, to: number): Promise<Point> {
    const grip = await boxOf(this.grip(from));
    const target = await boxOf(this.contacts.nth(to - 1));
    const x = grip.x + grip.width / 2;
    const y = grip.y + grip.height / 2;
    const pointer = { x, y: target.y + target.height * 0.75 };

    await this.contacts.nth(from - 1).hover();
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x, y + 6);
    await this.page.mouse.move(pointer.x, pointer.y, { steps: 8 });
    return pointer;
  }

  async drop(): Promise<void> {
    await this.page.mouse.up();
  }

  async readOutput(): Promise<SmartFormOutput> {
    return parseSmartFormOutput(await this.output.innerText());
  }
}
