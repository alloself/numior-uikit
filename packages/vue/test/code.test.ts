import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { installClipboard, type ClipboardStub } from '../../primitives/test/support/clipboard';
import type { NuiCodeLine, NuiHighlighter } from '../src';
import { CodeDriver } from './drivers/code';

const SAMPLE = "const answer = 42;\nconsole.log('hi');\n";

const TOKENS: readonly NuiCodeLine[] = [
  [
    { text: 'const', scope: 'keyword' },
    { text: ' answer = ' },
    { text: '42', scope: 'number' },
    { text: ';', scope: 'punctuation' },
  ],
  [
    { text: 'console' },
    { text: '.', scope: 'punctuation' },
    { text: 'log', scope: 'function' },
    { text: "('hi')" },
    { text: ';', scope: 'punctuation' },
  ],
];

const highlighterOf = (calls: string[], lazy = false): NuiHighlighter => ({
  languages: [{ id: 'typescript', label: 'TypeScript', aliases: ['ts'] }],
  tokens: (code, language) => {
    calls.push(`${language}:${code.length}`);
    return lazy ? Promise.resolve(TOKENS) : TOKENS;
  },
});

describe('NuiCode', () => {
  let clipboard: ClipboardStub | undefined;

  afterEach(() => {
    clipboard?.restore();
    clipboard = undefined;
  });

  it('splits the code into lines, drops the trailing newline and paints tokens by scope', () => {
    const plain = CodeDriver.mount({ props: { code: SAMPLE } });
    expect(plain.lineTexts).toEqual(['const answer = 42;', "console.log('hi');"]);
    expect(plain.scopesOf(1)).toEqual([]);
    expect(plain.copyFloats).toBe(true);

    const painted = CodeDriver.mount({ props: { code: SAMPLE, tokens: TOKENS, language: 'ts' } });
    expect(painted.lineTexts).toEqual(['const answer = 42;', "console.log('hi');"]);
    expect(painted.scopesOf(1)).toEqual(['keyword', 'number', 'punctuation']);
    expect(painted.language).toBe('ts');
    expect(painted.copyFloats).toBe(false);

    const mismatched = CodeDriver.mount({ props: { code: SAMPLE, tokens: [TOKENS[0] ?? []] } });
    expect(mismatched.scopesOf(1)).toEqual([]);
  });

  it('centres the floating copy button on a one-line block', () => {
    const single = CodeDriver.mount({ props: { code: 'pnpm add @numior/vue' } });
    expect(single.hasModifier('single')).toBe(true);

    const multi = CodeDriver.mount({ props: { code: SAMPLE } });
    expect(multi.hasModifier('single')).toBe(false);
  });

  it('numbers and highlights lines, shows a title and wraps on request', () => {
    const code = CodeDriver.mount({
      props: { code: SAMPLE, title: 'main.ts', lineNumbers: true, highlight: [2], wrap: true },
    });

    expect(code.title).toBe('main.ts');
    expect(code.language).toBeUndefined();
    expect(code.hasModifier('line-numbers')).toBe(true);
    expect(code.hasModifier('wrap')).toBe(true);
    expect(code.hasModifier('titled')).toBe(true);
    expect(code.highlightedLines).toEqual([2]);
  });

  it('copies the source and announces it, speaking the configured language', async () => {
    clipboard = installClipboard();
    const code = CodeDriver.mount({ props: { code: SAMPLE }, config: { locale: 'ru-RU' } });
    expect(code.copyLabel).toBe('Скопировать код');
    expect(code.status).toBe('');

    await code.copy();
    expect(clipboard.copies).toEqual([SAMPLE]);
    expect(code.copyLabel).toBe('Скопировано');
    expect(code.status).toBe('Скопировано');
    expect(code.hasModifier('copied')).toBe(true);

    const labelled = CodeDriver.mount({ props: { code: SAMPLE, copyLabel: 'Grab' } });
    expect(labelled.copyLabel).toBe('Grab');

    expect(
      CodeDriver.mount({ props: { code: SAMPLE, copyable: false } }).copyLabel,
    ).toBeUndefined();
  });

  it('collapses long code behind an expand toggle', async () => {
    const short = CodeDriver.mount({ props: { code: SAMPLE, maxLines: 5 } });
    expect(short.expandLabel).toBeUndefined();
    expect(short.hasModifier('collapsible')).toBe(false);

    const long = CodeDriver.mount({ props: { code: SAMPLE, maxLines: 1 } });
    expect(long.hasModifier('collapsible')).toBe(true);
    expect(long.hasModifier('collapsed')).toBe(true);
    expect(long.expandLabel).toBe('Show more');
    expect(long.expanded).toBe(false);

    await long.toggleExpand();
    expect(long.expanded).toBe(true);
    expect(long.hasModifier('collapsed')).toBe(false);
    expect(long.expandLabel).toBe('Show less');
  });

  it('colours code through the configured highlighter by language or alias and leaves the rest plain', async () => {
    const calls: string[] = [];
    const config = { highlighter: highlighterOf(calls) };
    const coloured = CodeDriver.mount({ props: { code: SAMPLE, language: 'ts' }, config });

    await coloured.settle();
    expect(coloured.scopesOf(1)).toEqual(['keyword', 'number', 'punctuation']);

    const unknown = CodeDriver.mount({ props: { code: SAMPLE, language: 'go' }, config });

    const off = CodeDriver.mount({
      props: { code: SAMPLE, language: 'typescript', highlighter: false },
      config,
    });

    await unknown.settle();
    await off.settle();
    expect(unknown.scopesOf(1)).toEqual([]);
    expect(off.scopesOf(1)).toEqual([]);
    expect(calls).toEqual(['typescript:38']);
  });

  it('colours code with the built-in Shiki when nothing is configured, unless the config turns it off', async () => {
    const coloured = CodeDriver.mount({ props: { code: SAMPLE, language: 'ts' } });

    await vi.waitFor(
      () => {
        expect(coloured.scopesOf(1)).toEqual([
          'keyword',
          'variable',
          'punctuation',
          'number',
          'punctuation',
        ]);
      },
      { timeout: 10_000 },
    );

    const again = CodeDriver.mount({ props: { code: SAMPLE, language: 'typescript' } });

    const off = CodeDriver.mount({
      props: { code: SAMPLE, language: 'ts' },
      config: { highlighter: false },
    });

    await again.settle();
    await off.settle();

    expect(again.scopesOf(1)).toEqual([
      'keyword',
      'variable',
      'punctuation',
      'number',
      'punctuation',
    ]);

    expect(off.scopesOf(1)).toEqual([]);
  }, 30_000);

  it('colours code that ends with a line break when the highlighter answers its empty last line', async () => {
    const config = {
      highlighter: { ...highlighterOf([]), tokens: () => [...TOKENS, []] },
    };

    const coloured = CodeDriver.mount({ props: { code: SAMPLE, language: 'ts' }, config });

    await coloured.settle();

    expect(coloured.lineTexts).toEqual(['const answer = 42;', "console.log('hi');"]);
    expect(coloured.scopesOf(2)).toEqual(['punctuation', 'function', 'punctuation']);
  });

  it('takes the given tokens without asking the highlighter', async () => {
    const calls: string[] = [];

    const given = CodeDriver.mount({
      props: { code: SAMPLE, language: 'ts', tokens: TOKENS },
      config: { highlighter: highlighterOf(calls) },
    });

    await given.settle();

    expect(given.scopesOf(1)).toEqual(['keyword', 'number', 'punctuation']);
    expect(calls).toEqual([]);
  });

  it('shows plain code until a lazy highlighter answers and reuses its answer', async () => {
    const calls: string[] = [];
    const config = { highlighter: highlighterOf(calls, true) };
    const first = CodeDriver.mount({ props: { code: SAMPLE, language: 'typescript' }, config });

    expect(first.scopesOf(1)).toEqual([]);

    await first.settle();
    expect(first.scopesOf(2)).toEqual(['punctuation', 'function', 'punctuation']);

    const second = CodeDriver.mount({ props: { code: SAMPLE, language: 'ts' }, config });

    await second.settle();
    expect(second.scopesOf(1)).toEqual(['keyword', 'number', 'punctuation']);
    expect(calls).toEqual(['typescript:38']);
  });
});
