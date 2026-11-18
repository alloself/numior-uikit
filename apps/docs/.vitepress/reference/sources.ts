import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { ComponentEntry, FlatFamily, ReferenceEntry } from './reference.types.ts';

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
        : { name, package: pkg, family: flat.family, file, dir },
    ];
  });
};

export const familyFile = (entry: ComponentEntry, suffix: string): string | undefined => {
  const file = join(entry.dir, `${entry.family}${suffix}`);

  return existsSync(file) ? file : undefined;
};

export const packageEntry = (name: string, dir: string): ReferenceEntry => ({
  name,
  source: `${dir}/src/index.ts`,
  types: `${dir}/dist/index.d.ts`,
});

const COLLABORATION = 'packages/collaboration';

export const ENTRIES: readonly ReferenceEntry[] = [
  packageEntry('@numior/vue', 'packages/vue'),
  packageEntry('@numior/forms', 'packages/forms'),
  packageEntry('@numior/table', 'packages/table'),
  packageEntry('@numior/content', 'packages/content'),
  packageEntry('@numior/editor-vue', 'packages/editor-vue'),
  packageEntry('@numior/spreadsheet', 'packages/spreadsheet'),
  packageEntry('@numior/charts', 'packages/charts'),
  packageEntry('@numior/collaboration', COLLABORATION),
  {
    name: '@numior/collaboration/vue',
    source: `${COLLABORATION}/src/vue/index.ts`,
    types: `${COLLABORATION}/dist/vue/index.d.ts`,
    flat: { family: 'collab' },
  },
  {
    name: '@numior/collaboration/room',
    source: `${COLLABORATION}/src/room/index.ts`,
    types: `${COLLABORATION}/dist/room/index.d.ts`,
  },
  {
    name: '@numior/collaboration/yjs',
    source: `${COLLABORATION}/src/yjs/index.ts`,
    types: `${COLLABORATION}/dist/yjs/index.d.ts`,
  },
  packageEntry('@numior/offline', 'packages/offline'),
];

export const allEntries = (root: string): ComponentEntry[] =>
  ENTRIES.flatMap((entry) => componentEntries(join(root, entry.source), entry.name, entry.flat));
