import { sortBy, uniq } from 'lodash-es';
import type { KitManifest } from './vite.types';

export const knownNames = (manifest: KitManifest): Set<string> =>
  new Set([...Object.keys(manifest.components), ...Object.keys(manifest.exports)]);

export const usedSheets = (manifest: KitManifest, names: Iterable<string>): string[] => {
  const sheets = [...names].flatMap(
    (name) => manifest.components[name]?.styles ?? manifest.exports[name] ?? [],
  );

  return sortBy(uniq(sheets), (sheet) => manifest.order.indexOf(sheet));
};

export const sheetImports = (sheets: readonly string[]): string =>
  sheets.map((sheet) => `@import '${sheet}';\n`).join('');
