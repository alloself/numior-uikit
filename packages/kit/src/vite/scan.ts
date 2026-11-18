import { readFile } from 'node:fs/promises';
import { Scanner } from '@tailwindcss/oxide';
import { componentName } from './names';
import type { ScanSource } from './vite.types';

const COMPONENT_NAME = /\bNui[A-Z][A-Za-z0-9]*|(?<=<)nui-[a-z0-9-]+/gu;
const KIT_IMPORT = /\bimport\s*\{([^}]*)\}\s*from\s*["']@numior\/kit(?:\/[^"']*)?["']/gu;
const SPECIFIER = /^\s*(?:type\s+)?([A-Za-z_$][\w$]*)/u;
const EVERY_FILE = '**/*';
const SOURCE_RULE = /@source\s+(not\s+)?(["'])(.+?)\2/gu;

const importedNames = (text: string): string[] =>
  [...text.matchAll(KIT_IMPORT)].flatMap(([, list = '']) =>
    list.split(',').flatMap((specifier) => SPECIFIER.exec(specifier)?.[1] ?? []),
  );

export const namesIn = (text: string, known: ReadonlySet<string>): string[] =>
  [
    ...[...text.matchAll(COMPONENT_NAME)].map(([match]) => componentName(match)),
    ...importedNames(text),
  ].filter((name) => known.has(name));

export const projectSource = (base: string): ScanSource => ({
  base,
  pattern: EVERY_FILE,
  negated: false,
});

export const sourcesIn = (css: string, base: string): ScanSource[] =>
  [...css.matchAll(SOURCE_RULE)].map(([, not, , pattern = '']) => ({
    base,
    pattern,
    negated: not !== undefined,
  }));

export const sourceFiles = (sources: readonly ScanSource[]): string[] =>
  new Scanner({ sources: [...sources] }).files;

export const textOf = (file: string): Promise<string> => readFile(file, 'utf8').catch(() => '');

export const namesInFiles = async (
  files: readonly string[],
  known: ReadonlySet<string>,
): Promise<Set<string>> => {
  const texts = await Promise.all(files.map(textOf));

  return new Set(texts.flatMap((text) => namesIn(text, known)));
};
