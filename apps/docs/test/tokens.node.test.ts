import { createHighlighter, type Highlighter } from 'shiki';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { CODE_LANGUAGES } from '../.vitepress/markdown/languages';
import { codeLanguageOf, tokenizeCode } from '../.vitepress/markdown/tokens';

const textsOf = (highlighter: Highlighter, code: string, lang: string, scope: string): string[] =>
  (tokenizeCode(highlighter, code, lang) ?? [])
    .flat()
    .filter((token) => token.scope === scope)
    .map((token) => token.text.trim())
    .filter((text) => text !== '');

describe('tokenizeCode', () => {
  let highlighter: Highlighter;

  beforeAll(async () => {
    highlighter = await createHighlighter({ themes: ['github-light'], langs: [...CODE_LANGUAGES] });
  });

  afterAll(() => {
    highlighter.dispose();
  });

  it('colours every piece by its own scope instead of the merged token', () => {
    const code =
      "import { ref, computed } from 'vue';\nconst count = ref(0);\ncount.value += typeof step === 'number' ? new Step().size : 1;";

    expect(textsOf(highlighter, code, 'ts', 'keyword')).toEqual([
      'import',
      'from',
      'const',
      'typeof',
      'new',
    ]);

    expect(textsOf(highlighter, code, 'ts', 'variable')).toEqual([
      'ref',
      'computed',
      'count',
      'count',
      'step',
    ]);

    expect(textsOf(highlighter, code, 'ts', 'property')).toEqual(['value', 'size']);
    expect(textsOf(highlighter, code, 'ts', 'punctuation')).toContain('{');
    expect(textsOf(highlighter, code, 'ts', 'string')).toEqual(["'vue'", "'number'"]);
  });

  it('highlights nested markup of a vue fence without a template block and shell fences', () => {
    const snippet = '<NuiCard>\n  <NuiButton variant="soft">Сохранить</NuiButton>\n</NuiCard>';
    expect(codeLanguageOf('vue', snippet)).toBe('vue-html');
    expect(codeLanguageOf('vue', '<template>\n  <div />\n</template>')).toBe('vue');
    const tags = textsOf(highlighter, snippet, 'vue', 'tag');
    expect(tags.some((text) => text.includes('NuiButton'))).toBe(true);
    expect(tags.some((text) => text.includes('Сохранить'))).toBe(false);
    expect(textsOf(highlighter, snippet, 'vue', 'attribute')).toEqual(['variant']);
    expect(codeLanguageOf('sh', 'pnpm add @numior/vue')).toBe('bash');
    expect(tokenizeCode(highlighter, 'pnpm add @numior/vue', 'sh')).toBeDefined();
    expect(tokenizeCode(highlighter, 'x', 'cobol')).toBeUndefined();
  });
});
