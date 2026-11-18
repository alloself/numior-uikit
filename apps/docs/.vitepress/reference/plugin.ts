import { existsSync, readFileSync } from 'node:fs';
import type { Plugin } from 'vitepress';
import type { Highlighter } from 'shiki';
import type { NuiCodeLine } from '@numior/vue';
import type { CodeLanguage } from '../markdown/languages.ts';
import { tokenizeCode } from '../markdown/tokens.ts';
import { parseBundle } from './bundle.ts';
import type { ReferenceBundle } from './reference.types.ts';
import { styleImportOf } from './stylesheet-paths.ts';

export type SignatureTokenizer = (
  code: string,
  language: CodeLanguage,
) => readonly NuiCodeLine[] | undefined;

const REGISTRY_ID = 'virtual:nui-reference';
const SLICE_PREFIX = 'virtual:nui-reference/';
const RESOLVED_REGISTRY = `\0${REGISTRY_ID}`;
const RESOLVED_PREFIX = `\0${SLICE_PREFIX}`;

const noTokens: SignatureTokenizer = () => undefined;

const lazyEntries = (names: readonly string[], kind: string): string =>
  names
    .map(
      (name) =>
        `${JSON.stringify(name)}: () => import(${JSON.stringify(`${SLICE_PREFIX}${kind}/${name}`)})`,
    )
    .join(', ');

const registryModule = (bundle: ReferenceBundle): string =>
  `export default { components: { ${lazyEntries(Object.keys(bundle.components), 'component')} }, catalogs: { ${lazyEntries(Object.keys(bundle.catalogs), 'catalog')} }, declarations: { ${lazyEntries(
    bundle.declarations.map((entry) => entry.name),
    'declaration',
  )} } };\n`;

const declarationModule = (
  bundle: ReferenceBundle,
  name: string,
  tokenize: SignatureTokenizer,
): string => {
  const declaration = bundle.declarations.find((entry) => entry.name === name);

  if (declaration === undefined) {
    return 'export default null;\n';
  }
  return `export default ${JSON.stringify({ ...declaration, tokens: tokenize(declaration.signature, 'ts') })};\n`;
};

const componentModule = (
  bundle: ReferenceBundle,
  name: string,
  tokenize: SignatureTokenizer,
): string => {
  const component = bundle.components[name];

  if (component === undefined) {
    return 'export default null;\n';
  }

  const styles =
    component.styles === undefined
      ? undefined
      : {
          ...component.styles,
          importTokens: tokenize(styleImportOf(component.styles.import), 'css'),
        };

  return `export default ${JSON.stringify({ ...component, styles })};\n`;
};

const sliceModule = (
  bundle: ReferenceBundle,
  key: string,
  tokenize: SignatureTokenizer,
): string => {
  const [kind, name] = key.split('/');

  switch (kind) {
    case 'component':
      return componentModule(bundle, name ?? '', tokenize);
    case 'catalog':
      return `export default ${JSON.stringify(bundle.catalogs[name ?? ''] ?? null)};\n`;
    case 'declaration':
      return declarationModule(bundle, name ?? '', tokenize);
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
  tokenize: SignatureTokenizer = noTokens,
): string | undefined => {
  if (id === RESOLVED_REGISTRY) {
    return registryModule(bundle());
  }
  return id.startsWith(RESOLVED_PREFIX)
    ? sliceModule(bundle(), id.slice(RESOLVED_PREFIX.length), tokenize)
    : undefined;
};

const readBundle = (file: string): ReferenceBundle => {
  if (!existsSync(file)) {
    throw new Error(`Missing docs reference bundle at ${file}; run pnpm docs:reference`);
  }
  return parseBundle(readFileSync(file, 'utf8'));
};

export const docsReference = (file: string, highlighter: Highlighter): Plugin => {
  let bundle: ReferenceBundle | undefined;

  const current = (): ReferenceBundle => {
    bundle ??= readBundle(file);
    return bundle;
  };

  const tokenize: SignatureTokenizer = (code, language) =>
    tokenizeCode(highlighter, code, language);

  return {
    name: 'nui-docs-reference',
    resolveId: resolveReferenceId,
    load: (id) => loadReferenceModule(current, id, tokenize),
  };
};
