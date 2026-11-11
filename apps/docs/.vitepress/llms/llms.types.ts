import type { ExampleLocale } from '../examples/example.types.ts';
import type { ReferenceBundle } from '../reference/reference.types.ts';
import type { DocsSite, DocsTexts, NavEntry } from '../theme/theme.types.ts';

export interface TwinFile {
  readonly name: string;
  readonly source: string;
}

export interface TwinContext {
  readonly locale: ExampleLocale;
  readonly texts: DocsTexts;
  readonly bundle: ReferenceBundle | undefined;
  readonly exampleOf: (name: string) => readonly TwinFile[] | undefined;
}

export interface LlmsEntry extends NavEntry {
  readonly path: string;
  readonly description: string;
  readonly twin: string;
}

export interface LlmsSource {
  readonly srcDir: string;
  readonly examplesRoot: string;
  readonly bundle: ReferenceBundle | undefined;
  readonly site: DocsSite;
}

export interface LlmsFile {
  readonly path: string;
  readonly content: string;
}

export interface LlmsCatalog {
  readonly locale: ExampleLocale;
  readonly title: string;
  readonly description: string;
  readonly site: DocsSite;
  readonly entries: readonly LlmsEntry[];
}
