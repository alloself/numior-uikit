import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { uniqBy } from 'lodash-es';
import { createChecker, type MetaCheckerOptions } from 'vue-component-meta';
import { catalogReference } from './catalogs.ts';
import { parseBlocks, parseTokens } from './css.ts';
import { enumerationMembers, exportedDeclarations } from './declarations.ts';
import { applyDocs, checkDocs } from './docs.ts';
import { exampleSources } from '../examples/modules.ts';
import { parseIconAliases } from './icons.ts';
import { kitEntries, type KitEntries } from './kit-entries.ts';
import { compiledKitCss, isLayered, THEME_FILE } from './kit-css.ts';
import { componentReference } from './meta.ts';
import { sceneProblems, type SceneSource } from './scenes.ts';
import { allEntries, ENTRIES, familyFile, packageEntry } from './sources.ts';
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

const PRIMITIVES = packageEntry('@numior/primitives', 'packages/primitives');

const CHECKER_OPTIONS: MetaCheckerOptions = {
  forceUseTs: true,
  printer: { newLine: 1 },
  schema: { ignore: ['HTMLElement', 'Element'] },
};

export const createReferenceChecker = (root: string): ReferenceChecker =>
  createChecker(join(root, 'tsconfig.reference.json'), CHECKER_OPTIONS);

const THEME_NAMES: ReadonlySet<string> = new Set(
  parseThemeTokens(readFileSync(THEME_FILE, 'utf8')).map((token) => token.name),
);

const tokensOf = async (css: string): Promise<string[]> => {
  const compiled = isLayered(css) ? await compiledKitCss(css) : '';

  return parseTokens(`${css}\n${compiled}`, THEME_NAMES);
};

const stylesOf = async (entry: ComponentEntry): Promise<ReferenceStyles | undefined> => {
  const file = familyFile(entry, '.css');

  if (file === undefined) {
    return undefined;
  }
  const css = readFileSync(file, 'utf8');

  return { blocks: parseBlocks(css), tokens: await tokensOf(css) };
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

const kitFacing = (component: ComponentReference, kit: KitEntries): ComponentReference => ({
  ...component,
  package: kit.module(component.package),
});

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
  const kit = kitEntries(root);

  for (const entry of allEntries(root)) {
    const collected = await collectComponent(checker, entry, docs, members, sceneOf);

    components[entry.name] = kitFacing(
      { ...collected.component, file: relative(root, entry.file) },
      kit,
    );

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
      declarations: uniqBy(
        [PRIMITIVES, ...ENTRIES].flatMap((entry) =>
          exportedDeclarations(join(root, entry.types), kit.module(entry.name), componentNames),
        ),
        (declaration) => `${declaration.package}#${declaration.name}`,
      ),
      tokens: parseThemeTokens(readFileSync(THEME_FILE, 'utf8')),
      icons: parseIconAliases(
        readFileSync(join(root, 'packages/primitives/src/icons/icon-aliases.ts'), 'utf8'),
      ),
    },
    problems,
    undocumented: Object.keys(components).filter((name) => docs[name] === undefined),
  };
};
