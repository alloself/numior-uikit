import { createNuiConfig, provideLocale, useLocale } from '../../src';
import { captureSetup, nest, providing } from './capture';

type Explicit = () => string | undefined;

export class LocaleHarness {
  static standalone(explicit?: Explicit): LocaleHarness {
    return new LocaleHarness(captureSetup(() => useLocale(explicit)).value.value);
  }

  static withPlugin(locale: string | undefined, explicit?: Explicit): LocaleHarness {
    return new LocaleHarness(
      captureSetup(() => useLocale(explicit), { plugins: [createNuiConfig({ locale })] }).value
        .value,
    );
  }

  static withProviders(
    outer: string | undefined,
    inner: string | undefined,
    explicit?: Explicit,
  ): LocaleHarness {
    return new LocaleHarness(
      captureSetup(() => useLocale(explicit), {
        wrap: nest(
          providing(() => provideLocale(outer)),
          providing(() => provideLocale(inner)),
        ),
      }).value.value,
    );
  }

  private constructor(readonly locale: string) {}
}
