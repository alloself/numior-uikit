import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createChecker, type MetaCheckerOptions } from 'vue-component-meta';
import { catalogReference } from './catalogs.ts';
import { parseBlocks, parseTokens } from './css.ts';
import { enumerationMembers, exportedDeclarations } from './declarations.ts';
import { applyDocs, checkDocs } from './docs.ts';
import { exampleSources } from '../examples/modules.ts';
import { parseIconAliases } from './icons.ts';
import { compiledKitCss, isLayered, THEME_FILE } from './kit-css.ts';
import { legacyTokenCss, legacyTokensOf } from './legacy-tokens.ts';
import { componentReference } from './meta.ts';
import { sceneProblems, type SceneSource } from './scenes.ts';
import { componentEntries, familyFile, familyStyleImport } from './sources.ts';
import { parseThemeTokens } from './tokens.ts';
import type {
  CatalogReference,
  ComponentEntry,
  ComponentReference,
  DocsMap,
  ReferenceBundle,
  ReferenceStyles,
} from './reference.types.ts';

export type ReferenceChecker = ReturnType<typeof createChecker>;

export interface ReferenceBuild {
  readonly bundle: ReferenceBundle;
  readonly problems: readonly string[];
  readonly undocumented: readonly string[];
}

interface CollectedComponent {
  readonly component: ComponentReference;
  readonly catalog: CatalogReference | undefined;
  readonly problems: readonly string[];
}

const PACKAGES = [
  { name: '@numior/vue', dir: 'packages/vue' },
  { name: '@numior/forms', dir: 'packages/forms' },
  { name: '@numior/table', dir: 'packages/table' },
  { name: '@numior/content', dir: 'packages/content' },
  { name: '@numior/editor-vue', dir: 'packages/editor-vue' },
  { name: '@numior/spreadsheet', dir: 'packages/spreadsheet' },
  { name: '@numior/charts', dir: 'packages/charts' },
] as const;

const PRIMITIVES = { name: '@numior/primitives', dir: 'packages/primitives' } as const;

const CHECKER_OPTIONS: MetaCheckerOptions = {
  forceUseTs: true,
  printer: { newLine: 1 },
  schema: { ignore: ['HTMLElement', 'Element'] },
};

export const createReferenceChecker = (root: string): ReferenceChecker =>
  createChecker(join(root, 'tsconfig.reference.json'), CHECKER_OPTIONS);

const tokensOf = async (css: string): Promise<string[]> =>
  isLayered(css)
    ? legacyTokensOf(await compiledKitCss(css), readFileSync(THEME_FILE, 'utf8'))
    : parseTokens(css);

const stylesOf = async (entry: ComponentEntry): Promise<ReferenceStyles | undefined> => {
  const file = familyFile(entry, '.css');
  const importPath = familyStyleImport(entry);

  if (file === undefined || importPath === undefined) {
    return undefined;
  }
  const css = readFileSync(file, 'utf8');

  return { import: importPath, blocks: parseBlocks(css), tokens: await tokensOf(css) };
};

const loadCatalog = async (file: string): Promise<CatalogReference | undefined> =>
  catalogReference(await import(pathToFileURL(file).href));

const collectComponent = async (
  checker: ReferenceChecker,
  entry: ComponentEntry,
  docs: DocsMap,
  members: ReadonlyMap<string, string>,
  sceneOf: SceneSource,
): Promise<CollectedComponent> => {
  const messagesFile = familyFile(entry, '.messages.ts');
  const catalog = messagesFile === undefined ? undefined : await loadCatalog(messagesFile);

  const component = componentReference(
    entry,
    checker.getComponentMeta(entry.file),
    await stylesOf(entry),
    catalog?.namespace,
    members,
  );

  const componentDocs = docs[entry.name];

  return {
    component: applyDocs(component, componentDocs),
    catalog,
    problems:
      componentDocs === undefined
        ? []
        : [
            ...checkDocs(component, componentDocs),
            ...sceneProblems(component.name, componentDocs.configurator, sceneOf),
          ],
  };
};

const MEMBER_DEFAULT = /^[A-Z]\w*\.[A-Z]\w*$/;

const unresolvedDefaults = (component: ComponentReference): string[] =>
  component.props.flatMap((prop) =>
    prop.default !== undefined && MEMBER_DEFAULT.test(prop.default)
      ? [
          `${component.name}.${prop.name}: default ${prop.default} is not an exported enumeration member`,
        ]
      : [],
  );

const EXAMPLES_DIR = 'apps/docs/examples';

const sceneSourceOf =
  (root: string): SceneSource =>
  (locale, name) => {
    const entry = exampleSources(join(root, EXAMPLES_DIR), `${locale}/${name}`)?.entry;

    return entry === undefined ? undefined : readFileSync(entry, 'utf8');
  };

const allEntries = (root: string): ComponentEntry[] =>
  PACKAGES.flatMap((pkg) => componentEntries(join(root, pkg.dir, 'src/index.ts'), pkg.name));

export const buildReference = async (
  root: string,
  docs: DocsMap,
  checker: ReferenceChecker = createReferenceChecker(root),
): Promise<ReferenceBuild> => {
  const members = new Map(
    [PRIMITIVES, ...PACKAGES].flatMap((pkg) => [
      ...enumerationMembers(join(root, pkg.dir, 'dist/index.d.ts')),
    ]),
  );

  const components: Record<string, ComponentReference> = {};
  const catalogs: Record<string, CatalogReference> = {};
  const problems: string[] = [];
  const sceneOf = sceneSourceOf(root);

  for (const entry of allEntries(root)) {
    const collected = await collectComponent(checker, entry, docs, members, sceneOf);

    components[entry.name] = collected.component;
    problems.push(...collected.problems, ...unresolvedDefaults(collected.component));
    if (collected.catalog !== undefined) {
      catalogs[collected.catalog.namespace] = collected.catalog;
    }
  }
  const componentNames = new Set(Object.keys(components));

  return {
    bundle: {
      version: 1,
      components,
      catalogs,
      declarations: [PRIMITIVES, ...PACKAGES].flatMap((pkg) =>
        exportedDeclarations(join(root, pkg.dir, 'dist/index.d.ts'), pkg.name, componentNames),
      ),
      tokens: parseThemeTokens(legacyTokenCss(readFileSync(THEME_FILE, 'utf8'))),
      icons: parseIconAliases(
        readFileSync(join(root, 'packages/primitives/src/icons/icon-aliases.ts'), 'utf8'),
      ),
    },
    problems,
    undocumented: Object.keys(components).filter((name) => docs[name] === undefined),
  };
};
