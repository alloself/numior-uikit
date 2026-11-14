import type { McpLocale } from './data.types';

export interface SearchDocument {
  readonly id: string;
  readonly title: string;
  readonly headings: string;
  readonly description: string;
  readonly text: string;
}

export interface SearchHit {
  readonly path: string;
  readonly title: string;
  readonly section: string;
  readonly score: number;
  readonly snippet: string;
}

export type PageSearch = (query: string, locale: McpLocale, limit: number) => SearchHit[];

export interface ToolTexts {
  readonly unknownComponent: (name: string, nearest: string | undefined) => string;
  readonly unknownPackage: (name: string, packages: readonly string[]) => string;
  readonly unknownExample: (name: string, suggestions: readonly string[]) => string;
  readonly unknownPage: (path: string, nearest: string | undefined) => string;
  readonly unknownGroup: (group: string, groups: readonly string[]) => string;
}
