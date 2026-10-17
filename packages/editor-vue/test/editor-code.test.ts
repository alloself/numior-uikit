import { contentSchema } from '@numior/content';
import { createDoc, toJSON, type DocJSON, type ElementNode } from '@numior/editor-core';
import type { NuiHighlighter } from '@numior/primitives';
import { afterEach, beforeAll, describe, expect, it } from 'vite-plus/test';
import { EditorDriver } from './drivers/editor';
import { EditorCodeDriver } from './drivers/editor-code';
import { installPopovers } from './support/popovers';

let driver: EditorDriver | undefined;

beforeAll(() => {
  installPopovers();
});

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

const element = (
  type: string,
  id: string,
  content: readonly ElementNode[] = [],
  attrs: Readonly<Record<string, string | null>> = {},
): ElementNode => contentSchema.element(type, { id, attrs, content });

const codeNode = (code: string, language: string | null): ElementNode =>
  contentSchema.element('code_block', {
    id: 'c',
    attrs: { language },
    content: [contentSchema.text(code)],
  });

const withCode = (code: string, language: string | null): DocJSON =>
  toJSON(createDoc(contentSchema, element('doc', 'root', [codeNode(code, language)])));

const besideText = (code: string): DocJSON =>
  toJSON(
    createDoc(
      contentSchema,
      element('doc', 'root', [
        contentSchema.element('paragraph', { id: 'p', content: [contentSchema.text('intro')] }),
        codeNode(code, 'ts'),
      ]),
    ),
  );

const highlighter: NuiHighlighter = {
  languages: [
    { id: 'typescript', label: 'TypeScript', aliases: ['ts'] },
    { id: 'python', label: 'Python', aliases: ['py'] },
  ],
  tokens: (code, language) =>
    language === 'typescript'
      ? code
          .split('\n')
          .map((line) => [
            { text: line.slice(0, 5), scope: 'keyword' as const },
            { text: line.slice(5) },
          ])
      : Promise.resolve(code.split('\n').map((line) => [{ text: line, scope: 'string' as const }])),
};

const mounted = (document: DocJSON, readonly = false): EditorDriver => {
  driver = EditorDriver.mount({ document, highlighter, readonly });
  return driver;
};

describe('NuiEditor code blocks', () => {
  it('paints code through the highlighter without touching the document', async () => {
    const editor = mounted(withCode('const a = 1', 'ts'));
    const code = EditorCodeDriver.of(editor);

    await code.settle();

    expect(code.tokens(0)).toEqual(['keyword:const']);
    expect(code.language(0)).toBe('TypeScript');
    expect(editor.documents).toEqual([]);
  });

  it('switches the language from the bar and repaints with the new grammar', async () => {
    const editor = mounted(withCode('x = 1', 'ts'));
    const code = EditorCodeDriver.of(editor);

    await code.settle();
    expect(code.checkedLanguage(0)).toBe('TypeScript');
    await code.pickLanguage(0, 'Python');

    expect(code.language(0)).toBe('Python');
    expect(code.checkedLanguage(0)).toBe('Python');
    expect(code.tokens(0)).toEqual(['string:x = 1']);
    expect(JSON.stringify(editor.documents.at(-1))).toContain('"language":"python"');

    await code.pickLanguage(0, 'Plain text');

    expect(code.tokens(0)).toEqual([]);
  });

  it('names the language without a picker while reading', async () => {
    const code = EditorCodeDriver.of(mounted(withCode('print(1)', 'py'), true));

    await code.settle();

    expect(code.language(0)).toBe('Python');
  });

  it('keeps the colours on a block moved elsewhere and follows text typed inside it', async () => {
    const editor = mounted(besideText('const a = 1'));
    const code = EditorCodeDriver.of(editor);

    await code.settle();
    editor.focus();
    await editor.select(9);
    await editor.press('ArrowUp', { ctrl: true, shift: true });

    expect(editor.blockTexts[0]).toBe('pre:const a = 1');
    expect(code.tokens(0)).toEqual(['keyword:const']);

    await editor.select(2);
    await editor.type('x');

    await code.settle();
    expect(code.tokens(0)).toEqual(['keyword:cxons']);
  });
});
