import { fileURLToPath } from 'node:url';
import { createHighlighter, type Highlighter } from 'shiki';
import { beforeAll, describe, expect, it } from 'vite-plus/test';
import {
  exampleModule,
  exampleNames,
  exampleSources,
  isRegistryId,
  loadVirtualModule,
  registryModule,
  resolveVirtualId,
} from '../.vitepress/examples/modules';
import {
  copyableSource,
  demoFilesOf,
  demoLocaleOf,
  demoRootOf,
  resolveDemo,
} from '../.vitepress/examples/demo';
import { compareDemo, compareExamples, exampleSignature } from '../.vitepress/examples/parity';

const EXAMPLES = fileURLToPath(new URL('../examples', import.meta.url));
const FIXTURES = fileURLToPath(new URL('./fixtures/examples', import.meta.url));
const DEMO = demoRootOf(FIXTURES);
const UNKNOWN_DATA = fileURLToPath(new URL('./fixtures/unknown-data.txt', import.meta.url));

const sourcesOf = (root: string, key: string) => {
  const sources = exampleSources(root, key);

  if (sources === undefined) {
    throw new Error(`No example ${key} under ${root}`);
  }
  return sources;
};

describe('docs examples', () => {
  let highlighter: Highlighter;

  beforeAll(async () => {
    highlighter = await createHighlighter({ themes: ['github-light'], langs: ['vue', 'ts'] });
  });

  it('lists every example of both locales as a lazy import', () => {
    expect(exampleNames(EXAMPLES).ru).toContain('button/Basic');

    expect(registryModule(EXAMPLES)).toMatch(
      /"ru": \{[^}]*"button\/Basic": \(\) => import\("virtual:nui-example\/ru\/button\/Basic"\)/,
    );

    expect(registryModule(EXAMPLES)).toMatch(
      /"en": \{[^}]*"button\/Basic": \(\) => import\("virtual:nui-example\/en\/button\/Basic"\)/,
    );
  });

  it('bundles the entry component with the source and tokens of each file', () => {
    const code = exampleModule(highlighter, sourcesOf(EXAMPLES, 'ru/button/Basic'));

    expect(code).toContain('import component from "');
    expect(code).toContain('/examples/ru/button/Basic.vue";');
    expect(code).toContain('"name":"Basic.vue","language":"vue","source":"<template>');
    expect(code).toContain('"scope":"tag"');
  });

  it('serves the registry and the examples as virtual modules and watches their files', () => {
    const watched: string[] = [];

    const watch = (file: string): void => {
      watched.push(file);
    };

    expect(resolveVirtualId('virtual:nui-examples')).toBe('\0virtual:nui-examples');

    expect(resolveVirtualId('virtual:nui-example/ru/button/Basic')).toBe(
      '\0virtual:nui-example/ru/button/Basic',
    );

    expect(resolveVirtualId('vue')).toBeUndefined();
    expect(isRegistryId('\0virtual:nui-examples')).toBe(true);
    expect(isRegistryId('\0virtual:nui-example/ru/button/Basic')).toBe(false);

    expect(loadVirtualModule(EXAMPLES, highlighter, '\0virtual:nui-examples', watch)).toContain(
      '"button/Basic"',
    );

    expect(
      loadVirtualModule(EXAMPLES, highlighter, '\0virtual:nui-example/en/button/Basic', watch),
    ).toContain('"name":"Basic.vue"');

    expect(watched.map((file) => file.slice(EXAMPLES.length))).toEqual(['/en/button/Basic.vue']);

    expect(loadVirtualModule(EXAMPLES, highlighter, '/src/main.ts', watch)).toBeUndefined();

    expect(() =>
      loadVirtualModule(EXAMPLES, highlighter, '\0virtual:nui-example/ru/button/Nope', watch),
    ).toThrow('Unknown docs example: ru/button/Nope');
  });

  it('treats a folder with index.vue as a multi-file example', () => {
    const sources = sourcesOf(FIXTURES, 'ru/table/Server');

    expect(
      sources.files.map((file) => file.slice(sources.entry.length - 'index.vue'.length)),
    ).toEqual(['index.vue', 'data.ts']);

    expect(exampleNames(FIXTURES)).toEqual({
      ru: ['chip/Alone', 'list/Shop', 'table/Server'],
      en: ['list/Shop', 'table/Server'],
    });

    expect(exampleSources(FIXTURES, 'ru/table/Missing')).toBeUndefined();
  });

  it('compares locales up to their strings and reports missing counterparts', () => {
    expect(exampleSignature('<template><NuiButton>Hi</NuiButton></template>')).toBe(
      exampleSignature('<template><NuiButton>Привет</NuiButton></template>'),
    );

    expect(exampleSignature('<template><NuiButton>Hi</NuiButton></template>')).not.toBe(
      exampleSignature('<template><NuiButton variant="soft">Hi</NuiButton></template>'),
    );

    expect(exampleSignature('<script setup lang="ts">const a = \'x\';</script>')).toBe(
      exampleSignature('<script setup lang="ts">const a = \'у\';</script>'),
    );

    expect(compareExamples(EXAMPLES)).toEqual([]);
    expect(compareExamples(FIXTURES)).toEqual(['en/chip/Alone is missing']);
  });

  it('resolves shop data by the locale of the example that imports it', () => {
    const ruExample = `${FIXTURES}/ru/list/Shop.vue?vue&type=script&setup=true&lang.ts`;
    const enExample = `${FIXTURES}/en/list/Shop.vue`;

    expect(demoLocaleOf(ruExample)).toBe('ru');
    expect(demoLocaleOf(`${DEMO}/en/orders.ts`)).toBe('en');
    expect(demoLocaleOf('/src/main.ts')).toBeUndefined();

    expect(resolveDemo(DEMO, '#demo/orders', ruExample)).toBe(`${DEMO}/ru/orders.ts`);
    expect(resolveDemo(DEMO, '#demo/orders', enExample)).toBe(`${DEMO}/en/orders.ts`);
    expect(resolveDemo(DEMO, '#demo/random', enExample)).toBe(`${DEMO}/shared/random.ts`);
    expect(resolveDemo(DEMO, 'vue', enExample)).toBeUndefined();

    expect(() => resolveDemo(DEMO, '#demo/orders', '/src/main.ts')).toThrow(
      '#demo/orders is imported outside a localized example: /src/main.ts',
    );

    expect(() => resolveDemo(DEMO, '#demo/nothing', enExample)).toThrow(
      `Unknown demo data: #demo/nothing in ${enExample}`,
    );

    expect(() => resolveDemo(DEMO, '#demo/orders', undefined)).toThrow(
      'imported outside a localized example',
    );
  });

  it('shows the data an example imports as files the reader can copy next to it', () => {
    const sources = sourcesOf(FIXTURES, 'en/list/Shop');
    const code = exampleModule(highlighter, sources);
    const watched: string[] = [];

    expect(sources.files).toEqual([`${FIXTURES}/en/list/Shop.vue`]);
    expect(sources.data).toEqual([`${DEMO}/en/orders.ts`, `${DEMO}/shared/random.ts`]);
    expect(sourcesOf(FIXTURES, 'ru/table/Server').data).toEqual([]);

    expect(code).toContain('"name":"orders.ts","language":"ts"');
    expect(code).toContain('"name":"random.ts"');
    expect(code).toContain("import { orders } from './orders';");
    expect(code).toContain("import { seeded } from './random';");
    expect(code).not.toContain('#demo');

    expect(copyableSource("import { team } from '#demo/team';")).toBe(
      "import { team } from './team';",
    );

    loadVirtualModule(FIXTURES, highlighter, '\0virtual:nui-example/en/list/Shop', (file) => {
      watched.push(file);
    });

    expect(watched).toEqual([...sources.files, ...sources.data]);

    expect(() => demoFilesOf(DEMO, 'en', [UNKNOWN_DATA])).toThrow(
      `Unknown demo data: #demo/nothing in ${UNKNOWN_DATA}`,
    );
  });

  it('compares the shop data of both locales up to their strings and numbers', () => {
    expect(compareDemo(demoRootOf(EXAMPLES))).toEqual([]);

    expect(compareDemo(DEMO)).toEqual([
      'demo/en/products.ts is missing',
      'demo/ru/team.ts and demo/en/team.ts differ beyond their strings and numbers',
    ]);

    expect(compareDemo(`${DEMO}/nowhere`)).toEqual([]);
  });
});
