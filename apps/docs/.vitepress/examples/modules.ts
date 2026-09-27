import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, posix, sep } from 'node:path';
import type { Highlighter } from 'shiki';
import { isCodeLanguage } from '../markdown/languages.ts';
import { tokenizeCode } from '../markdown/tokens.ts';
import type { ExampleLocale, ExampleSources } from './example.types.ts';

export const EXAMPLE_LOCALES: readonly ExampleLocale[] = ['ru', 'en'];
const REGISTRY_ID = 'virtual:nui-examples';
const EXAMPLE_PREFIX = 'virtual:nui-example/';
const RESOLVED_REGISTRY = `\0${REGISTRY_ID}`;
const RESOLVED_PREFIX = `\0${EXAMPLE_PREFIX}`;

const ENTRY = 'index.vue';
const VUE = '.vue';

const toPosix = (path: string): string => path.split(sep).join(posix.sep);

const isDirectory = (path: string): boolean => existsSync(path) && statSync(path).isDirectory();

const exampleNameOf = (
  componentDir: string,
  component: string,
  entry: string,
): string | undefined => {
  const path = join(componentDir, entry);

  if (isDirectory(path)) {
    return existsSync(join(path, ENTRY)) ? `${component}/${entry}` : undefined;
  }
  return entry.endsWith(VUE) ? `${component}/${entry.slice(0, -VUE.length)}` : undefined;
};

const listExamples = (localeDir: string): string[] => {
  if (!isDirectory(localeDir)) {
    return [];
  }
  return readdirSync(localeDir)
    .toSorted()
    .filter((component) => isDirectory(join(localeDir, component)))
    .flatMap((component) => {
      const componentDir = join(localeDir, component);

      return readdirSync(componentDir)
        .toSorted()
        .flatMap((entry) => {
          const name = exampleNameOf(componentDir, component, entry);

          return name === undefined ? [] : [name];
        });
    });
};

export const exampleNames = (root: string): Readonly<Record<ExampleLocale, readonly string[]>> => ({
  ru: listExamples(join(root, 'ru')),
  en: listExamples(join(root, 'en')),
});

export const exampleSources = (root: string, key: string): ExampleSources | undefined => {
  const single = join(root, `${key}${VUE}`);

  if (existsSync(single)) {
    return { entry: single, files: [single] };
  }
  const dir = join(root, key);
  const entry = join(dir, ENTRY);

  if (!existsSync(entry)) {
    return undefined;
  }

  const rest = readdirSync(dir)
    .filter((name) => name !== ENTRY && !isDirectory(join(dir, name)))
    .toSorted()
    .map((name) => join(dir, name));

  return { entry, files: [entry, ...rest] };
};

const languageOf = (file: string): string | undefined => {
  const extension = extname(file).slice(1);

  return isCodeLanguage(extension) ? extension : undefined;
};

export const registryModule = (root: string): string => {
  const names = exampleNames(root);

  const locales = EXAMPLE_LOCALES.map((locale) => {
    const entries = names[locale].map(
      (name) =>
        `${JSON.stringify(name)}: () => import(${JSON.stringify(`${EXAMPLE_PREFIX}${locale}/${name}`)})`,
    );

    return `${JSON.stringify(locale)}: { ${entries.join(', ')} }`;
  });

  return `export default { ${locales.join(', ')} };\n`;
};

export const exampleModule = (highlighter: Highlighter, sources: ExampleSources): string => {
  const files = sources.files.map((file) => {
    const source = readFileSync(file, 'utf8').replace(/\n$/, '');
    const language = languageOf(file);

    return {
      name: basename(file),
      language,
      source,
      tokens: language === undefined ? undefined : tokenizeCode(highlighter, source, language),
    };
  });

  return `import component from ${JSON.stringify(toPosix(sources.entry))};\nexport default { component, files: ${JSON.stringify(files)} };\n`;
};

export const isRegistryId = (id: string): boolean => id === RESOLVED_REGISTRY;

export const resolveVirtualId = (id: string): string | undefined =>
  id === REGISTRY_ID || id.startsWith(EXAMPLE_PREFIX) ? `\0${id}` : undefined;

export const loadVirtualModule = (
  root: string,
  highlighter: Highlighter,
  id: string,
  watch: (file: string) => void,
): string | undefined => {
  if (id === RESOLVED_REGISTRY) {
    return registryModule(root);
  }
  if (!id.startsWith(RESOLVED_PREFIX)) {
    return undefined;
  }
  const key = id.slice(RESOLVED_PREFIX.length);
  const sources = exampleSources(root, key);

  if (sources === undefined) {
    throw new Error(`Unknown docs example: ${key}`);
  }
  for (const file of sources.files) {
    watch(file);
  }
  return exampleModule(highlighter, sources);
};
