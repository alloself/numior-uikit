import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { ref } from 'vue';
import type { NuiLocaleMessages, NuiTranslate } from '../src';
import { MessagesHarness } from './harness/messages';

const languageDescriptor = Object.getOwnPropertyDescriptor(navigator, 'language');

describe('message dictionary', () => {
  afterEach(() => {
    if (languageDescriptor) {
      Object.defineProperty(navigator, 'language', languageDescriptor);
    } else {
      Reflect.deleteProperty(navigator, 'language');
    }
  });

  it('speaks English by default and never reads the browser language', () => {
    Object.defineProperty(navigator, 'language', { value: 'ru-RU', configurable: true });

    const english = MessagesHarness.standalone();

    expect(english.close).toBe('Close');
    expect(english.count(2)).toBe('2 selected');
  });

  it('finds the built-in language through the locale chain and falls back to English', () => {
    expect(MessagesHarness.withPlugin({ locale: 'ru-RU' }).close).toBe('Закрыть');
    expect(MessagesHarness.withPlugin({ locale: 'ru-KZ' }).count(3)).toBe('Выбрано: 3');
    expect(MessagesHarness.withPlugin({ locale: 'de-DE' }).close).toBe('Close');
    expect(MessagesHarness.withPlugin({ locale: 'not a locale' }).open).toBe('Open');
  });

  it('overrides single keys and keeps the rest of the built-in language', () => {
    const russian = MessagesHarness.withPlugin({
      locale: 'ru-RU',
      messages: { ru: { probe: { close: 'Закрыть окно' } } },
    });

    expect(russian.close).toBe('Закрыть окно');
    expect(russian.open).toBe('Открыть');
  });

  it('adds a partial language that falls back to English and prefers the regional tag', () => {
    const messages: NuiLocaleMessages = {
      de: { probe: { close: 'Schließen', open: 'Öffnen' } },
      'de-AT': { probe: { open: 'Aufmachen' } },
    };

    const german = MessagesHarness.withPlugin({ locale: 'de-DE', messages });
    const austrian = MessagesHarness.withPlugin({ locale: 'de-AT', messages });

    expect(german.open).toBe('Öffnen');
    expect(german.count(2)).toBe('2 selected');
    expect(austrian.open).toBe('Aufmachen');
    expect(austrian.close).toBe('Schließen');
  });

  it('treats an English override as the fallback for other languages but not over Russian', () => {
    const messages: NuiLocaleMessages = { en: { probe: { close: 'Dismiss' } } };

    expect(MessagesHarness.withPlugin({ locale: 'de-DE', messages }).close).toBe('Dismiss');
    expect(MessagesHarness.withPlugin({ locale: 'ru-RU', messages }).close).toBe('Закрыть');
  });

  it('lets the nearer provider win for a tag and a more specific tag win over it', () => {
    const nested = MessagesHarness.withProviders(
      {
        locale: 'ru-RU',
        messages: { ru: { probe: { close: 'Снаружи' } }, 'ru-RU': { probe: { open: 'Точно' } } },
      },
      { messages: { ru: { probe: { close: 'Внутри', open: 'Общее' } } } },
    );

    expect(nested.close).toBe('Внутри');
    expect(nested.open).toBe('Точно');
  });

  it('follows an explicit locale over the configured one', () => {
    expect(MessagesHarness.withPlugin({ locale: 'ru-RU' }, () => 'en-GB').close).toBe('Close');
    expect(MessagesHarness.withPlugin({ locale: 'en-US' }, () => 'ru').close).toBe('Закрыть');
    expect(MessagesHarness.withPlugin({ locale: 'ru-RU' }, () => undefined).close).toBe('Закрыть');
  });

  it('recomputes when the locale or the messages change', () => {
    const locale = ref('en-US');
    const messages = ref<NuiLocaleMessages | undefined>(undefined);

    const harness = MessagesHarness.withPlugin({ locale, messages });

    expect(harness.close).toBe('Close');
    locale.value = 'ru-RU';
    expect(harness.close).toBe('Закрыть');
    messages.value = { ru: { probe: { close: 'Скрыть' } } };
    expect(harness.close).toBe('Скрыть');
  });

  it('asks the translate hook first and falls back to the dictionary without a text', () => {
    const translate = vi.fn<NuiTranslate>((key, params) => {
      if (key === 'probe.close') {
        return 'i18n: close';
      }
      return key === 'probe.count' ? `i18n: ${String(params?.count)}` : undefined;
    });

    const harness = MessagesHarness.withPlugin({
      locale: 'ru-RU',
      translate,
      messages: { ru: { probe: { open: 'Раскрыть' } } },
    });

    expect(harness.close).toBe('i18n: close');
    expect(harness.open).toBe('Раскрыть');
    expect(harness.count(4)).toBe('i18n: 4');
    expect(translate).toHaveBeenCalledWith('probe.open', undefined, 'ru-RU');
    expect(translate).toHaveBeenCalledWith('probe.count', { count: 4 }, 'ru-RU');
  });

  it('asks the nearer translate hook before the outer one and passes an explicit locale', () => {
    const outer = vi.fn<NuiTranslate>((key) => (key === 'probe.open' ? 'outer open' : 'outer'));
    const inner = vi.fn<NuiTranslate>((key) => (key === 'probe.close' ? 'inner close' : undefined));

    const nested = MessagesHarness.withProviders(
      { locale: 'ru-RU', translate: outer },
      { translate: inner },
      () => 'de-DE',
    );

    expect(nested.close).toBe('inner close');
    expect(nested.open).toBe('outer open');
    expect(outer).not.toHaveBeenCalledWith('probe.close', undefined, 'de-DE');
    expect(inner).toHaveBeenCalledWith('probe.open', undefined, 'de-DE');
  });
});
