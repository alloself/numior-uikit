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
  ReferenceEntry,
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

const packageEntry = (name: string, dir: string): ReferenceEntry => ({
  name,
  source: `${dir}/src/index.ts`,
  types: `${dir}/dist/index.d.ts`,
});

const COLLABORATION = 'packages/collaboration';

const ENTRIES: readonly ReferenceEntry[] = [
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
    flat: { family: 'collab', styles: '@numior/collaboration/styles.css' },
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

const PRIMITIVES = packageEntry('@numior/primitives', 'packages/primitives');

const CHECKER_OPTIONS: MetaCheckerOptions = {
  forceUseTs: true,
  printer: { newLine: 1 },
  schema: { ignore: ['HTMLElement', 'Element'] },
};

export const createReferenceChecker = (root: string): ReferenceChecker =>
  createChecker(join(root, 'tsconfig.reference.json'), CHECKER_OPTIONS);

const stylesOf = (entry: ComponentEntry): ReferenceStyles | undefined => {
  const file = familyFile(entry, '.css');
  const importPath = familyStyleImport(entry);

  if (file === undefined || importPath === undefined) {
    return undefined;
  }
  const css = readFileSync(file, 'utf8');

  return { import: importPath, blocks: parseBlocks(css), tokens: parseTokens(css) };
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
    stylesOf(entry),
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
  ENTRIES.flatMap((entry) => componentEntries(join(root, entry.source), entry.name, entry.flat));

export const buildReference = async (
  root: string,
  docs: DocsMap,
  checker: ReferenceChecker = createReferenceChecker(root),
): Promise<ReferenceBuild> => {
  const members = new Map(
    [PRIMITIVES, ...ENTRIES].flatMap((entry) => [...enumerationMembers(join(root, entry.types))]),
  );

  const components: Record<string, ComponentReference> = {};
  const catalogs: Record<string, CatalogReference> = {};
  const problems: string[] = [];
  const sceneOf = sceneSourceOf(root);

  for (const entry of allEntries(root)) {
    const collected = await collectComponent(checker, entry, docs, members, sceneOf);

    components[entry.name] = collected.component;
    problems.push(...collected.problems, ...unresolvedDefaults(collected.component));
    if (collected.catalog === undefined) {
      continue;
    }

    catalogs[collected.catalog.namespace] = collected.catalog;
  }
  const componentNames = new Set(Object.keys(components));

  return {
    bundle: {
      version: 1,
      components,
      catalogs,
      declarations: [PRIMITIVES, ...ENTRIES].flatMap((entry) =>
        exportedDeclarations(join(root, entry.types), entry.name, componentNames),
      ),
      tokens: parseThemeTokens(readFileSync(join(root, 'packages/tokens/src/theme.css'), 'utf8')),
      icons: parseIconAliases(
        readFileSync(join(root, 'packages/primitives/src/icons/icon-aliases.ts'), 'utf8'),
      ),
    },
    problems,
    undocumented: Object.keys(components).filter((name) => docs[name] === undefined),
  };
};
