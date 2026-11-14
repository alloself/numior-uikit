import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { ComponentEntry, FlatFamily } from './reference.types.ts';

const COMPONENT_EXPORT_RE = /export \{ default as (Nui\w+) \} from '(\.\/[^']+\.vue)';/g;

export const componentEntries = (
  indexFile: string,
  pkg: string,
  flat?: FlatFamily,
): ComponentEntry[] => {
  const source = readFileSync(indexFile, 'utf8');

  return [...source.matchAll(COMPONENT_EXPORT_RE)].flatMap((match) => {
    const [, name, path] = match;

    if (name === undefined || path === undefined) {
      return [];
    }
    const file = resolve(dirname(indexFile), path);
    const dir = dirname(file);

    return [
      flat === undefined
        ? { name, package: pkg, family: dirname(path).split('/').at(-1) ?? '', file, dir }
        : { name, package: pkg, family: flat.family, file, dir, styles: flat.styles },
    ];
  });
};

export const familyFile = (entry: ComponentEntry, suffix: string): string | undefined => {
  const file = join(entry.dir, `${entry.family}${suffix}`);

  return existsSync(file) ? file : undefined;
};

export const familyStyleImport = (entry: ComponentEntry): string | undefined =>
  familyFile(entry, '.css') === undefined
    ? undefined
    : (entry.styles ?? `${entry.package}/styles/${entry.family}.css`);
