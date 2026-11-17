import { languageOf } from '@numior/primitives';
import { describe, expect, it } from 'vite-plus/test';
import { createShikiHighlighter } from '../src/shiki';

const scopesOf = (
  lines: Awaited<ReturnType<ReturnType<typeof createShikiHighlighter>['tokens']>>,
) =>
  (lines ?? []).map((line) =>
    line.flatMap((token) => (token.scope === undefined ? [] : [token.scope])),
  );

describe('createShikiHighlighter', () => {
  it('loads Shiki on the first call and colours each language it is asked for', async () => {
    const highlighter = createShikiHighlighter();

    expect(scopesOf(await highlighter.tokens('const answer = 42;', 'typescript'))).toEqual([
      ['keyword', 'variable', 'punctuation', 'number', 'punctuation'],
    ]);

    expect(scopesOf(await highlighter.tokens('print("hi")', 'python'))[0]).toContain('function');
    expect(await highlighter.tokens('anything', 'klingon')).toBeUndefined();
  }, 30_000);

  it('names its languages with aliases for code fences and pickers', () => {
    const highlighter = createShikiHighlighter();

    expect(languageOf(highlighter, 'ts')?.label).toBe('TypeScript');
    expect(languageOf(highlighter, 'Bash')?.id).toBe('shellscript');
    expect(languageOf(highlighter, '')).toBeUndefined();
  });
});
