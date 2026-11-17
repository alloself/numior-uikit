import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recordOf } from './kit-packages.ts';

export interface KitEntries {
  readonly module: (specifier: string) => string;
  readonly sheet: (path: string) => string;
  readonly modules: readonly string[];
}

const KIT = '@numior/kit';
const KIT_DIR = 'packages/kit';
const SOURCE_CONDITION = '@numior/source';
const FORWARD_RE = /^(?:export \* from|@import) '(@numior\/[^']+)';$/gmu;
const BUNDLE = 'styles.css';
const SHEETS = 'styles/*.css';
const MODULE_BUNDLE_RE = /^\.\/([a-z-]+)\/styles\.css$/u;

const forwardsOf = (file: string): string[] =>
  existsSync(file)
    ? [...readFileSync(file, 'utf8').matchAll(FORWARD_RE)].map(([, specifier = '']) => specifier)
    : [];

const sourceOf = (entry: unknown): string | undefined => {
  const source = recordOf(entry)[SOURCE_CONDITION];

  return typeof source === 'string' && source.startsWith('./src/') ? source : undefined;
};

const kitSpecifier = (key: string): string => (key === '.' ? KIT : `${KIT}${key.slice(1)}`);

const sheetFolders = (
  forwards: ReadonlyMap<string, string>,
  keys: ReadonlySet<string>,
): Map<string, string> =>
  [...forwards].reduce((folders, [from, to]) => {
    const kitFolder = to.slice(KIT.length + 1, to.length - BUNDLE.length);

    if (from.endsWith(`/${BUNDLE}`) && keys.has(`./${kitFolder}${SHEETS}`)) {
      folders.set(from.replace(BUNDLE, 'styles/'), to.replace(BUNDLE, 'styles/'));
    }
    return folders;
  }, new Map<string, string>());

const missing = (path: string): never => {
  throw new Error(`${path} has no entry in @numior/kit: add one to packages/kit`);
};

export const kitEntries = (root: string): KitEntries => {
  const manifest = recordOf(JSON.parse(readFileSync(join(root, KIT_DIR, 'package.json'), 'utf8')));
  const exports = recordOf(manifest.exports);
  const forwards = new Map<string, string>();

  for (const [key, entry] of Object.entries(exports)) {
    const source = sourceOf(entry);

    if (source === undefined) {
      continue;
    }

    for (const specifier of forwardsOf(join(root, KIT_DIR, source))) {
      forwards.set(specifier, kitSpecifier(key));
    }
  }
  const folders = sheetFolders(forwards, new Set(Object.keys(exports)));

  const sheet = (path: string): string => {
    const exact = forwards.get(path);

    if (exact !== undefined) {
      return exact;
    }
    const [from, to] = [...folders].find(([prefix]) => path.startsWith(prefix)) ?? [];

    return from === undefined || to === undefined
      ? missing(path)
      : `${to}${path.slice(from.length)}`;
  };

  const modules = Object.keys(exports).flatMap((key) => {
    const [, folder] = MODULE_BUNDLE_RE.exec(key) ?? [];

    return folder === undefined ? [] : [`${KIT}/${folder}/`];
  });

  return { module: (specifier) => forwards.get(specifier) ?? missing(specifier), sheet, modules };
};
