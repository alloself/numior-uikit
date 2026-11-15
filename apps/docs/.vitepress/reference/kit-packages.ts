import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { uniq } from 'lodash-es';

export interface KitPackage {
  readonly name: string;
  readonly dir: string;
  readonly src: string;
  readonly exports: Readonly<Record<string, unknown>>;
  readonly dependencies: readonly string[];
}

export const STYLES_KEY = './styles.css';

const SCOPE = '@numior/';

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'));

export const recordOf = (value: unknown): Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};

const kitDependencies = (manifest: Readonly<Record<string, unknown>>): string[] =>
  uniq(
    [
      ...Object.keys(recordOf(manifest.dependencies)),
      ...Object.keys(recordOf(manifest.peerDependencies)),
    ].filter((name) => name.startsWith(SCOPE)),
  );

const kitPackage = (dir: string): KitPackage[] => {
  const file = join(dir, 'package.json');

  if (!existsSync(file)) {
    return [];
  }
  const manifest = recordOf(readJson(file));
  const name = typeof manifest.name === 'string' ? manifest.name : '';

  return name.startsWith(SCOPE)
    ? [
        {
          name,
          dir,
          src: join(dir, 'src'),
          exports: recordOf(manifest.exports),
          dependencies: kitDependencies(manifest),
        },
      ]
    : [];
};

export const kitPackages = (root: string): KitPackage[] => {
  const packagesDir = join(root, 'packages');

  return readdirSync(packagesDir).flatMap((name) => kitPackage(join(packagesDir, name)));
};

export const styledPackages = (root: string): ReadonlySet<string> =>
  new Set(
    kitPackages(root).reduce<string[]>((names, entry) => {
      if (STYLES_KEY in entry.exports) {
        names.push(entry.name);
      }
      return names;
    }, []),
  );
