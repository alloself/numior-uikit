import type { ExampleLocale } from '../examples/example.types.ts';

export type GuardRule = (typeof GuardRule)[keyof typeof GuardRule];

export interface GuardProblem {
  readonly rule: GuardRule;
  readonly file: string;
  readonly text: string;
}

export interface CatalogEntry {
  readonly file: string;
  readonly path: string;
  readonly locale: ExampleLocale;
  readonly text: string;
}

export interface ApiEntry extends CatalogEntry {
  readonly component: string;
  readonly member: string;
}

export interface ExampleContext {
  readonly vocabulary: ReadonlySet<string>;
}

export type TermList = Readonly<Record<ExampleLocale, readonly (readonly [RegExp, string])[]>>;
export type PatternList = Readonly<Record<ExampleLocale, readonly RegExp[]>>;

export const GuardRule = {
  Lead: 'lead',
  Opening: 'lead-opening',
  Caption: 'caption',
  Glossary: 'glossary',
  Meta: 'meta-text',
  Speed: 'speed-number',
  Catalog: 'catalog',
  Tautology: 'api-tautology',
  Home: 'home',
  Filler: 'demo-filler',
  Dump: 'label-dump',
  Names: 'demo-names',
  Imports: 'imports',
  Styles: 'component-styles',
} as const;
