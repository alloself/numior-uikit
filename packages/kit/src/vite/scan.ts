import { readFile } from 'node:fs/promises';
import { Scanner } from '@tailwindcss/oxide';
import { componentName } from './names';

const COMPONENT_NAME = /\bNui[A-Z][A-Za-z0-9]*|(?<=<)nui-[a-z0-9-]+/gu;
const KIT_IMPORT = /\bimport\s*\{([^}]*)\}\s*from\s*["']@numior\/kit(?:\/[^"']*)?["']/gu;
const SPECIFIER = /^\s*(?:type\s+)?([A-Za-z_$][\w$]*)/u;
const EVERY_FILE = '**/*';

const importedNames = (text: string): string[] =>
  [...text.matchAll(KIT_IMPORT)].flatMap(([, list = '']) =>
    list.split(',').flatMap((specifier) => SPECIFIER.exec(specifier)?.[1] ?? []),
  );

export const namesIn = (text: string, known: ReadonlySet<string>): string[] =>
  [
    ...[...text.matchAll(COMPONENT_NAME)].map(([match]) => componentName(match)),
    ...importedNames(text),
  ].filter((name) => known.has(name));

export const sourceFiles = (base: string): string[] =>
  new Scanner({ sources: [{ base, pattern: EVERY_FILE, negated: false }] }).files;

export const textOf = (file: string): Promise<string> => readFile(file, 'utf8').catch(() => '');

export const namesInFiles = async (
  files: readonly string[],
  known: ReadonlySet<string>,
): Promise<Set<string>> => {
  const texts = await Promise.all(files.map(textOf));

  return new Set(texts.flatMap((text) => namesIn(text, known)));
};
