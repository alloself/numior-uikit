import { afterEach, describe, expect, it } from 'vitest';
import { LocaleHarness } from './harness/locale';

const languageDescriptor = Object.getOwnPropertyDescriptor(navigator, 'language');

describe('locale context', () => {
  afterEach(() => {
    if (languageDescriptor) {
      Object.defineProperty(navigator, 'language', languageDescriptor);
    } else {
      Reflect.deleteProperty(navigator, 'language');
    }
  });

  it('defaults to en-US and never reads the browser language', () => {
    Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
    expect(LocaleHarness.standalone().locale).toBe('en-US');
  });

  it('takes the locale from the app plugin', () => {
    expect(LocaleHarness.withPlugin('ru-RU').locale).toBe('ru-RU');
    expect(LocaleHarness.withPlugin(undefined).locale).toBe('en-US');
  });

  it('layers nested providers and inherits through an empty layer', () => {
    expect(LocaleHarness.withProviders('de-DE', 'fr-FR').locale).toBe('fr-FR');
    expect(LocaleHarness.withProviders('de-DE', undefined).locale).toBe('de-DE');
    expect(LocaleHarness.withProviders(undefined, undefined).locale).toBe('en-US');
  });

  it('lets an explicit getter win and falls back when it is empty', () => {
    expect(LocaleHarness.withProviders('de-DE', 'fr-FR', () => 'ja-JP').locale).toBe('ja-JP');
    expect(LocaleHarness.withProviders('de-DE', 'fr-FR', () => '').locale).toBe('fr-FR');
    expect(LocaleHarness.withPlugin('ru-RU', () => undefined).locale).toBe('ru-RU');
  });
});
