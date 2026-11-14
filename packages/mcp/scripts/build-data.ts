import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyableSource } from '../../../apps/docs/.vitepress/examples/demo.ts';
import type { ExampleLocale } from '../../../apps/docs/.vitepress/examples/example.types.ts';
import {
  EXAMPLE_LOCALES,
  exampleNames,
  exampleSources,
} from '../../../apps/docs/.vitepress/examples/modules.ts';
import { llmsEntries } from '../../../apps/docs/.vitepress/llms/files.ts';
import type { LlmsEntry, LlmsSource } from '../../../apps/docs/.vitepress/llms/llms.types.ts';
import { parseBundle } from '../../../apps/docs/.vitepress/reference/bundle.ts';
import type {
  ComponentReference,
  ReferenceBundle,
} from '../../../apps/docs/.vitepress/reference/reference.types.ts';
import { site } from '../../../apps/docs/.vitepress/theme/site.ts';
import type {
  McpComponent,
  McpData,
  McpExamples,
  McpFile,
  McpPage,
  McpText,
} from '../src/data.types.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const DOCS = join(ROOT, 'apps/docs');
const EXAMPLES = join(DOCS, 'examples');
const OUT_FILE = fileURLToPath(new URL('../dist/data.json', import.meta.url));

const LOCALE_PREFIX = /^\/en(?=\/|$)/u;
const TRAILING_SLASH = /(?<=.)\/$/u;
const API_HEADING = /^### (Nui\w+)$/gmu;
const CODE_BLOCK = /^```(?:ts|js)\n([\s\S]*?)^```$/gmu;
const NAMED_IMPORT = /import\s*\{([^}]*)\}\s*from\s*'@numior\/[^']+'/gu;
const STYLE_IMPORT = /import\s+'([^']+\.css)'/gu;
const STYLES_EXPORT = './styles.css';

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const pagePathOf = (link: string): string =>
  link.replace(LOCALE_PREFIX, '').replace(TRAILING_SLASH, '') || '/';

const pageOf = (entry: LlmsEntry): McpPage => ({
  path: pagePathOf(entry.link),
  title: entry.title,
  section: entry.section,
  description: entry.description,
  markdown: entry.twin,
});

const fileOf = (path: string): McpFile => ({
  name: basename(path),
  source: copyableSource(readFileSync(path, 'utf8')),
});

const examplesOf = (locale: ExampleLocale): McpExamples =>
  Object.fromEntries(
    exampleNames(EXAMPLES)[locale].flatMap((name) => {
      const sources = exampleSources(EXAMPLES, `${locale}/${name}`);

      return sources === undefined ? [] : [[name, [...sources.files, ...sources.data].map(fileOf)]];
    }),
  );

const pagesByComponent = (pages: readonly McpPage[]): ReadonlyMap<string, readonly string[]> =>
  pages.reduce((found, page) => {
    for (const [, name = ''] of page.markdown.matchAll(API_HEADING)) {
      found.set(name, [...(found.get(name) ?? []), page.path]);
    }
    return found;
  }, new Map<string, readonly string[]>());

const namesIn = (list: string): string[] =>
  list
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '');

const installedStylesheets = (markdown: string, component: string): string[] =>
  [...markdown.matchAll(CODE_BLOCK)].reduce<string[]>((found, [, code = '']) => {
    const imported = [...code.matchAll(NAMED_IMPORT)].some(([, list = '']) =>
      namesIn(list).includes(component),
    );

    if (!imported) {
      return found;
    }
    for (const [, sheet = ''] of code.matchAll(STYLE_IMPORT)) {
      if (found.includes(sheet)) {
        continue;
      }

      found.push(sheet);
    }
    return found;
  }, []);

const stylesheetsOf = (
  component: ComponentReference,
  paths: readonly string[],
  pages: readonly McpPage[],
): string[] => {
  const sheets = pages.flatMap((page) =>
    paths.includes(page.path) ? installedStylesheets(page.markdown, component.name) : [],
  );

  const own = component.styles?.import;

  return [...new Set(own === undefined || sheets.length > 0 ? sheets : [own])];
};

const componentOf = (
  component: ComponentReference,
  paths: readonly string[],
  pages: readonly McpPage[],
): McpComponent => ({
  name: component.name,
  package: component.package,
  styles:
    component.styles === undefined
      ? undefined
      : {
          import: component.styles.import,
          blocks: component.styles.blocks,
          tokens: component.styles.tokens,
        },
  stylesheets: stylesheetsOf(component, paths, pages),
  messages: component.messages,
  props: component.props,
  models: component.models,
  events: component.events,
  slots: component.slots,
  exposed: component.exposed,
  keyboard: component.keyboard,
  pages: paths,
});

const exportsOf = (bundle: ReferenceBundle): Record<string, string[]> => {
  const names = [...Object.values(bundle.components), ...bundle.declarations].reduce(
    (found, item) => found.set(item.package, [...(found.get(item.package) ?? []), item.name]),
    new Map<string, string[]>(),
  );

  return Object.fromEntries(
    [...names].map(([entry, list]) => [entry, [...new Set(list)].toSorted()]),
  );
};

const exportsStyles = (manifest: Readonly<Record<string, unknown>>): boolean =>
  isRecord(manifest.exports) && STYLES_EXPORT in manifest.exports;

const styledPackageName = (manifest: unknown): string | undefined =>
  isRecord(manifest) && typeof manifest.name === 'string' && exportsStyles(manifest)
    ? manifest.name
    : undefined;

const packageStylesOf = (): Record<string, string> =>
  Object.fromEntries(
    readdirSync(join(ROOT, 'packages'), { withFileTypes: true }).flatMap((entry) => {
      if (!entry.isDirectory()) {
        return [];
      }

      const name = styledPackageName(
        JSON.parse(readFileSync(join(ROOT, 'packages', entry.name, 'package.json'), 'utf8')),
      );

      return name === undefined ? [] : [[name, `${name}/styles.css`]];
    }),
  );

const catalogsOf = (bundle: ReferenceBundle): Record<string, Readonly<Record<string, McpText>>> =>
  Object.fromEntries(
    Object.values(bundle.catalogs).map((catalog) => [catalog.namespace, catalog.texts]),
  );

const collectData = (): McpData => {
  const bundle = parseBundle(readFileSync(join(DOCS, '.reference/bundle.json'), 'utf8'));
  const source: LlmsSource = { srcDir: DOCS, examplesRoot: EXAMPLES, bundle, site };

  const pages = {
    en: llmsEntries(source, 'en').map(pageOf),
    ru: llmsEntries(source, 'ru').map(pageOf),
  };

  const componentPages = pagesByComponent(pages.en);

  return {
    version: 1,
    components: Object.fromEntries(
      Object.values(bundle.components).map((component) => [
        component.name,
        componentOf(component, componentPages.get(component.name) ?? [], pages.en),
      ]),
    ),
    catalogs: catalogsOf(bundle),
    exports: exportsOf(bundle),
    packageStyles: packageStylesOf(),
    tokens: bundle.tokens,
    icons: bundle.icons,
    pages,
    examples: { en: examplesOf('en'), ru: examplesOf('ru') },
  };
};

const data = collectData();
const json = JSON.stringify(data);

mkdirSync(join(OUT_FILE, '..'), { recursive: true });
writeFileSync(OUT_FILE, json);

console.log(
  `MCP data: ${Object.keys(data.components).length} components, ${EXAMPLE_LOCALES.map((locale) => `${data.pages[locale].length} ${locale} pages, ${Object.keys(data.examples[locale]).length} ${locale} examples`).join(', ')}, ${(Buffer.byteLength(json) / 1024 / 1024).toFixed(1)} MB.`,
);
