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

const decodeAttribute = (value: string): string =>
  value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');

const codeProps = (html: string) => {
  const match = /<NuiCode class="mb-5" v-bind='([^']*)'><\/NuiCode>/.exec(html);

  if (match?.[1] === undefined) {
    throw new Error(`No code block in: ${html}`);
  }
  return parseAs(decodeAttribute(match[1]), isCodeProps, 'code props');
};

const pageEnv = (relativePath: string) => ({ path: relativePath, relativePath, cleanUrls: true });

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
        config: (renderer) => docsMarkdown(renderer, highlighter),
      },
      '/',
    );
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
