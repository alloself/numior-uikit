import type { ComputedRef } from 'vue';
import {
  createNuiConfig,
  provideNuiConfig,
  useMessages,
  type NuiConfigOptions,
  type NuiMessageCatalog,
} from '../../src';
import { captureSetup } from './capture';

interface ProbeMessages {
  readonly close: string;
  readonly open: string;
  readonly count: (params: { readonly count: number }) => string;
}

export interface ProbeDictionary {
  readonly probe: ProbeMessages;
}

type Locale = () => string | undefined;

export const probeMessages: NuiMessageCatalog<ProbeMessages> = {
  namespace: 'probe',
  en: { close: 'Close', open: 'Open', count: ({ count }) => `${count} selected` },
  ru: { close: 'Закрыть', open: 'Открыть', count: ({ count }) => `Выбрано: ${count}` },
};

export class MessagesHarness {
  static standalone(locale?: Locale): MessagesHarness {
    return new MessagesHarness(captureSetup(() => useMessages(probeMessages, locale)).value);
  }

  static withPlugin(options: NuiConfigOptions, locale?: Locale): MessagesHarness {
    return new MessagesHarness(
      captureSetup(() => useMessages(probeMessages, locale), {
        plugins: [createNuiConfig(options)],
      }).value,
    );
  }

  static withProviders(
    outer: NuiConfigOptions,
    inner: NuiConfigOptions,
    locale?: Locale,
  ): MessagesHarness {
    return new MessagesHarness(
      captureSetup(() => useMessages(probeMessages, locale), {
        layers: [() => provideNuiConfig(outer), () => provideNuiConfig(inner)],
      }).value,
    );
  }

  private constructor(private readonly messages: ComputedRef<ProbeMessages>) {}

  get close(): string {
    return this.messages.value.close;
  }

  get open(): string {
    return this.messages.value.open;
  }

  count(value: number): string {
    return this.messages.value.count({ count: value });
  }
}
