import type { Component } from 'vue';
import type { NuiCodeLine } from '@numior/vue';

export type ExampleLocale = 'ru' | 'en';

export interface ExampleFile {
  readonly name: string;
  readonly language: string | undefined;
  readonly source: string;
  readonly tokens: NuiCodeLine[] | undefined;
}

export interface ExampleModule {
  readonly component: Component;
  readonly files: readonly ExampleFile[];
}

export type ExampleLoader = () => Promise<{ readonly default: ExampleModule }>;

export type ExampleRegistry = Readonly<
  Record<ExampleLocale, Readonly<Record<string, ExampleLoader>>>
>;

export interface ExampleSources {
  readonly entry: string;
  readonly files: readonly string[];
}
