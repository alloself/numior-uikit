import { existsSync, readFileSync } from 'node:fs';
import type { Plugin } from 'vitepress';
import { parseBundle } from './bundle.ts';
import type { ReferenceBundle } from './reference.types.ts';

const REGISTRY_ID = 'virtual:nui-reference';
const SLICE_PREFIX = 'virtual:nui-reference/';
const RESOLVED_REGISTRY = `\0${REGISTRY_ID}`;
const RESOLVED_PREFIX = `\0${SLICE_PREFIX}`;

const lazyEntries = (names: readonly string[], kind: string): string =>
  names
    .map(
      (name) =>
        `${JSON.stringify(name)}: () => import(${JSON.stringify(`${SLICE_PREFIX}${kind}/${name}`)})`,
    )
    .join(', ');

const registryModule = (bundle: ReferenceBundle): string =>
  `export default { components: { ${lazyEntries(Object.keys(bundle.components), 'component')} }, catalogs: { ${lazyEntries(Object.keys(bundle.catalogs), 'catalog')} } };\n`;

const sliceModule = (bundle: ReferenceBundle, key: string): string => {
  const [kind, name] = key.split('/');

  switch (kind) {
    case 'component':
      return `export default ${JSON.stringify(bundle.components[name ?? ''] ?? null)};\n`;
    case 'catalog':
      return `export default ${JSON.stringify(bundle.catalogs[name ?? ''] ?? null)};\n`;
    case 'tokens':
      return `export default ${JSON.stringify(bundle.tokens)};\n`;
    case 'icons':
      return `export default ${JSON.stringify(bundle.icons)};\n`;
    case 'declarations':
      return `export default ${JSON.stringify(bundle.declarations)};\n`;
    default:
      throw new Error(`Unknown docs reference slice: ${key}`);
  }
};

export const resolveReferenceId = (id: string): string | undefined =>
  id === REGISTRY_ID || id.startsWith(SLICE_PREFIX) ? `\0${id}` : undefined;

export const loadReferenceModule = (
  bundle: () => ReferenceBundle,
  id: string,
): string | undefined => {
  if (id === RESOLVED_REGISTRY) {
    return registryModule(bundle());
  }
  return id.startsWith(RESOLVED_PREFIX)
    ? sliceModule(bundle(), id.slice(RESOLVED_PREFIX.length))
    : undefined;
};

const readBundle = (file: string): ReferenceBundle => {
  if (!existsSync(file)) {
    throw new Error(`Missing docs reference bundle at ${file}; run pnpm docs:reference`);
  }
  return parseBundle(readFileSync(file, 'utf8'));
};

export const docsReference = (file: string): Plugin => {
  let bundle: ReferenceBundle | undefined;

  const current = (): ReferenceBundle => {
    bundle ??= readBundle(file);
    return bundle;
  };

  return {
    name: 'nui-docs-reference',
    resolveId: resolveReferenceId,
    load: (id) => loadReferenceModule(current, id),
  };
};
