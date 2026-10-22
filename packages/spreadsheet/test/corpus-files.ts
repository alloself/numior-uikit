import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface CorpusEntry {
  readonly name: string;
  readonly data: Uint8Array<ArrayBuffer>;
}

export type CorpusSource =
  | { readonly kind: 'bytes'; readonly bytes: Uint8Array<ArrayBuffer> }
  | { readonly kind: 'parts'; readonly parts: readonly CorpusEntry[] };

const CORPUS = fileURLToPath(new URL('./corpus/xlsx/', import.meta.url));

const filesUnder = (folder: string): string[] =>
  readdirSync(folder).flatMap((entry) => {
    const path = join(folder, entry);

    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });

export const corpusFixtures = (): string[] => readdirSync(CORPUS).toSorted();

export const expectedPath = (name: string): string => join(CORPUS, name, 'expected.json');

export const corpusSource = (name: string): CorpusSource => {
  const single = join(CORPUS, name, 'package.bin');

  if (existsSync(single)) {
    return { kind: 'bytes', bytes: new Uint8Array(readFileSync(single)) };
  }

  const folder = join(CORPUS, name, 'package');

  return {
    kind: 'parts',
    parts: filesUnder(folder)
      .map((path) => relative(folder, path).split('\\').join('/'))
      .toSorted(
        (left, right) =>
          Number(right === '[Content_Types].xml') - Number(left === '[Content_Types].xml'),
      )
      .map((part) => ({ name: part, data: new Uint8Array(readFileSync(join(folder, part))) })),
  };
};
