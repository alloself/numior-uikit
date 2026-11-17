import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vite-plus/test';
import { createMarkdownRenderer, type MarkdownRenderer } from 'vitepress';
import { createHighlighter } from 'shiki';
import { docsMarkdown } from '../.vitepress/markdown';
import { headingPermalink } from '../.vitepress/markdown/anchors';
import type { InstallSource } from '../.vitepress/markdown/markdown.types';
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

const codeProps = (html: string) => {
  const match = /<div class="mb-5"><NuiCode v-bind='([^']*)'><\/NuiCode><\/div>/.exec(html);

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

const INSTALL: InstallSource = {
  components: {
    NuiSelect: {
      stylesheets: [
        '@numior/kit/styles/icon.css',
        '@numior/kit/styles/field.css',
        '@numior/kit/styles/select.css',
      ],
    },
    NuiTable: {
      stylesheets: ['@numior/kit/styles/icon.css', '@numior/kit/table/styles/table.css'],
    },
  },
  stylesheets: [
    '@numior/kit/styles.css',
    '@numior/kit/styles/icon.css',
    '@numior/kit/styles/field.css',
    '@numior/kit/styles/select.css',
    '@numior/kit/table/styles.css',
    '@numior/kit/table/styles/table.css',
  ],
};

const RU = pageEnv('components/button.md');
const EN = pageEnv('en/components/button.md');

describe('docs markdown', () => {
  let md: MarkdownRenderer;

  beforeAll(async () => {
    const highlighter = await createHighlighter({ themes: ['github-light'], langs: ['ts'] });

    md = await createMarkdownRenderer(
      fileURLToPath(new URL('..', import.meta.url)),
      {
        headers: { level: [2, 3] },
        anchor: { permalink: headingPermalink },
        config: (renderer) => docsMarkdown(renderer, highlighter, INSTALL),
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

  it('prints every stylesheet that the components of an install block render', () => {
    const files = codeProps(
      md.render("```ts install\nimport { NuiTable, NuiSelect } from '@numior/kit';\n```\n", RU),
    );

    expect(files.language).toBe('ts');

    expect(files.code).toBe(
      [
        "import { NuiTable, NuiSelect } from '@numior/kit';",
        "import '@numior/kit/styles/icon.css';",
        "import '@numior/kit/styles/field.css';",
        "import '@numior/kit/styles/select.css';",
        "import '@numior/kit/table/styles/table.css';",
      ].join('\n'),
    );

    const packages = codeProps(
      md.render("```ts install:packages\nimport { NuiTable } from '@numior/kit/table';\n```\n", RU),
    );

    expect(packages.code).toBe(
      [
        "import { NuiTable } from '@numior/kit/table';",
        "import '@numior/kit/styles.css';",
        "import '@numior/kit/table/styles.css';",
      ].join('\n'),
    );
  });

  it('prints no install command: the kit holds every module', () => {
    const html = md.render(
      "```ts install:packages\nimport { NuiTable } from '@numior/kit/table';\n```\n",
      RU,
    );

    expect(html).not.toContain('<CodeGroup');
  });

  it('refuses an install block that imports no component with styles', () => {
    expect(() =>
      md.render("```ts install\nimport { useToast } from '@numior/kit';\n```\n", RU),
    ).toThrow('imports no kit component with styles');
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
