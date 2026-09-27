import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NuiCodeLine } from '../src';
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

const fakeClipboard = () => {
  const writeText = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());

  vi.stubGlobal('navigator', { clipboard: { writeText } });
  return writeText;
};

describe('NuiCode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
    const writeText = fakeClipboard();
    const code = CodeDriver.mount({ props: { code: SAMPLE }, config: { locale: 'ru-RU' } });
    expect(code.copyLabel).toBe('Скопировать код');
    expect(code.status).toBe('');
    await code.copy();
    expect(writeText).toHaveBeenCalledWith(SAMPLE);
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
});
