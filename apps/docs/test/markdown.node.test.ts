import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vite-plus/test';
import { createMarkdownRenderer, type MarkdownRenderer } from 'vitepress';
import { createHighlighter } from 'shiki';
import { docsMarkdown } from '../.vitepress/markdown';
import { headingPermalink } from '../.vitepress/markdown/anchors';
import {
  isBoolean,
  isNumber,
  isString,
  listOf,
  optional,
  parseAs,
  shapeOf,
} from '../../../packages/primitives/test/support/guards';

const isToken = shapeOf({ text: isString, scope: optional(isString) });

const isCodeProps = shapeOf({
  code: isString,
  language: optional(isString),
  title: optional(isString),
  highlight: optional(listOf(isNumber)),
  lineNumbers: optional(isBoolean),
  tokens: optional(listOf(listOf(isToken))),
});

const isCodeGroup = listOf(shapeOf({ label: isString, code: isCodeProps }));

const decodeAttribute = (value: string): string =>
  value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');

const CODE_BLOCK_RE = /<div class="mb-5"><NuiCode v-bind='([^']*)'><\/NuiCode><\/div>/;

const codeProps = (html: string) => {
  const match = CODE_BLOCK_RE.exec(html);

  if (match?.[1] === undefined) {
    throw new Error(`No code block in: ${html}`);
  }
  return parseAs(decodeAttribute(match[1]), isCodeProps, 'code props');
};

const codeGroup = (html: string) => {
  const match = /<CodeGroup :items='([^']*)'><\/CodeGroup>/.exec(html);

  if (match?.[1] === undefined) {
    throw new Error(`No code group in: ${html}`);
  }
  return parseAs(decodeAttribute(match[1]), isCodeGroup, 'code group');
};

const pageEnv = (relativePath: string) => ({ path: relativePath, relativePath, cleanUrls: true });

const RU = pageEnv('components/button.md');
const EN = pageEnv('en/components/button.md');

describe('docs markdown', () => {
  let md: MarkdownRenderer;

  beforeAll(async () => {
    const highlighter = await createHighlighter({ themes: ['github-light'], langs: ['ts', 'css'] });

    md = await createMarkdownRenderer(
      fileURLToPath(new URL('..', import.meta.url)),
      {
        headers: { level: [2, 3] },
        anchor: { permalink: headingPermalink },
        config: (renderer) => docsMarkdown(renderer, highlighter),
      },
      '/',
    );
  });

  it('fills a code block with the file that the page imports as a snippet', () => {
    const props = codeProps(md.render('<<< @/demo/shared/random.ts\n', RU));

    expect(props.language).toBe('ts');
    expect(props.code).toContain('export type Random = () => number;');
  });

  it('renders a fence as a code block with tokens, title, highlighted lines and line numbers', () => {
    const html = md.render(
      '```ts title="a.ts" {2} :line-numbers\nconst a = 1;\nconst b = 2;\n```\n',
      RU,
    );

    const props = codeProps(html);

    expect(props.code).toBe('const a = 1;\nconst b = 2;');
    expect(props.language).toBe('ts');
    expect(props.title).toBe('a.ts');
    expect(props.highlight).toEqual([2]);
    expect(props.lineNumbers).toBe(true);
    expect(props.tokens).toHaveLength(2);
    expect(props.tokens?.[0]?.[0]).toEqual({ text: 'const', scope: 'keyword' });
  });

  it('gathers the fences of a code group into labelled variants of one block', () => {
    const html = md.render(
      '::: code-group\n\n```ts [first]\nconst a = 1;\n```\n\n```ts {1}\nconst b = 2;\n```\n\n:::\n\n```ts\nconst c = 3;\n```\n',
      RU,
    );

    const variants = codeGroup(html);

    expect(variants.map((variant) => variant.label)).toEqual(['first', 'ts']);
    expect(variants[0]?.code.code).toBe('const a = 1;');
    expect(variants[0]?.code.tokens).toHaveLength(1);
    expect(variants[1]?.code.highlight).toEqual([1]);
    expect(codeProps(html).code).toBe('const c = 3;');
    expect(html.match(/<NuiCode /g)).toHaveLength(1);
  });

  it('turns numbered steps into a readonly stepper with a step per heading', () => {
    const html = md.render(
      ':::: steps\n\n### Установите пакет\n\n::: code-group\n\n```sh [pnpm]\npnpm add @numior/kit\n```\n\n:::\n\n### Подключите стили\n\n<Example name="guide/First" />\n\n::::\n\n## Дальше\n',
      RU,
    );

    const stepper = html.slice(0, html.indexOf('</NuiStepper>'));
    const [, first = '', second = ''] = stepper.split('<NuiStepperStep>\n');

    expect(
      html.startsWith('<NuiStepper readonly>\n<NuiStepperStep>\n<template #title>\n<h3 '),
    ).toBe(true);

    expect(stepper.match(/<h3 [^>]*class="scroll-mt-20"/g)).toHaveLength(2);
    expect(stepper.match(/<\/NuiStepperStep>/g)).toHaveLength(2);

    expect(first).toMatch(
      /^<template #title>\n<h3 [^]*Установите пакет[^]*<\/h3>\n<\/template>\n<CodeGroup/,
    );

    expect(second).toMatch(
      /^<template #title>\n<h3 [^]*Подключите стили[^]*<\/h3>\n<\/template>\n/,
    );

    expect(second).toContain('<Example name="guide/First" />');
    expect(html.slice(html.indexOf('</NuiStepper>'))).toContain('<h2 ');
  });

  it('leaves a steps mark as text when it is not closed or does not start with a step heading', () => {
    const unclosed = md.render(':::: steps\n\n### Шаг\n', RU);
    const headless = md.render(':::: steps\n\nТекст\n\n### Шаг\n\n::::\n', RU);

    expect(unclosed).not.toContain('<NuiStepper');
    expect(unclosed).toContain(':::: steps');
    expect(headless).not.toContain('<NuiStepper');
    expect(headless).toContain(':::: steps');
  });

  it('keeps plain fences without a language or tokens', () => {
    expect(codeProps(md.render('```text\nplain\n```\n', RU))).toEqual({ code: 'plain' });
    expect(codeProps(md.render('```\nbare\n```\n', RU))).toEqual({ code: 'bare' });
    expect(codeProps(md.render('```\n```\n', RU))).toEqual({ code: '' });
  });

  it('keeps markup, quotes and ampersands of the code inside the attribute', () => {
    const code = `<NuiButton :disabled="a && b">'x'</NuiButton>`;
    const html = md.render(`\`\`\`vue\n${code}\n\`\`\`\n`, RU);

    expect(html).not.toContain('<NuiButton');
    expect(codeProps(html)).toEqual({ code, language: 'vue' });
  });

  it('renders links as kit links and marks external ones', () => {
    expect(md.render('[Кнопка](/components/button)', RU)).toContain(
      '<NuiLink href="/components/button">Кнопка</NuiLink>',
    );

    expect(md.render('[Vue](https://vuejs.org "Vue")', RU)).toContain(
      '<NuiLink href="https://vuejs.org" external title="Vue">Vue</NuiLink>',
    );
  });

  it('turns containers into alerts and collapsibles with a label in the page language', () => {
    expect(md.render('::: tip Совет\nТекст\n:::\n', RU)).toContain(
      '<NuiAlert tone="success" title="Совет">\n<p>Текст</p>\n</NuiAlert>',
    );

    expect(md.render('::: danger\nТекст\n:::\n', RU)).toContain('<NuiAlert tone="error">');

    expect(md.render('::: details\nТекст\n:::\n', RU)).toContain(
      '<NuiCollapsible variant="card" label="Подробнее">',
    );

    expect(md.render('::: details\nText\n:::\n', EN)).toContain(
      '<NuiCollapsible variant="card" label="Details">',
    );

    expect(md.render('::: details Ещё\nТекст\n:::\n', RU)).toContain('label="Ещё"');
  });

  it('adds a heading permalink labelled in the page language', () => {
    expect(md.render('## Размеры\n', RU)).toContain(
      '<h2 id="размеры" tabindex="-1">Размеры <a class="nui-prose__anchor" href="#размеры" aria-label="Ссылка на «Размеры»">&ZeroWidthSpace;</a></h2>',
    );

    expect(md.render('## Sizes\n', EN)).toContain(
      '<a class="nui-prose__anchor" href="#sizes" aria-label="Link to &quot;Sizes&quot;">',
    );
  });
});
