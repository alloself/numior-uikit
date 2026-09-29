import { mount, type VueWrapper } from '@vue/test-utils';
import type { ReferenceKey } from '../../.vitepress/reference/reference.types';
import ApiKeyboard from '../../.vitepress/theme/parts/ApiKeyboard.vue';
import { en, ru } from '../../.vitepress/theme/texts';

export class ApiKeyboardDriver {
  constructor(readonly wrapper: VueWrapper) {}

  static mount(keys: readonly ReferenceKey[], locale: 'ru' | 'en'): ApiKeyboardDriver {
    return new ApiKeyboardDriver(
      mount(ApiKeyboard, { props: { keys, locale, texts: locale === 'en' ? en : ru } }),
    );
  }

  keys(): string[] {
    return this.wrapper.findAll('.nui-kbd').map((kbd) => kbd.text());
  }

  rows(): string[][] {
    return this.wrapper
      .findAll('.nui-grid__body [role="row"]')
      .map((row) => row.findAll('[role="gridcell"]').map((cell) => cell.text()));
  }
}
