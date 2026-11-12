import { contentSchema } from '@numior/content';
import {
  createDoc,
  createState,
  type EditorState,
  type ElementNode,
  type Transaction,
} from '@numior/editor-core';
import type { NuiHighlighter } from '@numior/primitives';
import { promiseTimeout } from '@vueuse/core';
import { describe, expect, it } from 'vite-plus/test';
import {
  blockDecorations,
  changedBlocks,
  decorationSets,
  type BlockDecorations,
} from '../../editor-core/src/view/decorate';
import { codeHighlightPlugin, createCodeHighlighter } from '../src/blocks/code/code-highlight';

interface Typed {
  readonly spent: number;
  readonly shown: number;
}

const LINE = 'const value = compute(alpha, beta) + other;';

const highlighter: NuiHighlighter = {
  languages: [{ id: 'typescript', label: 'TypeScript', aliases: ['ts'] }],
  tokens: (code) =>
    code.split('\n').map((line) =>
      line.split(/(\s+)/).map((text, index) => ({
        text,
        scope: index % 2 === 0 ? ('keyword' as const) : undefined,
      })),
    ),
};

const codeBlock = (index: number): ElementNode =>
  contentSchema.element('code_block', {
    id: `c${String(index)}`,
    attrs: { language: 'ts' },
    content: [contentSchema.text(Array.from({ length: 40 }, () => LINE).join('\n'))],
  });

const paintedBook = async (blocks: number) => {
  const root = contentSchema.element('doc', {
    id: 'root',
    content: Array.from({ length: blocks }, (_unused, index) => codeBlock(index)),
  });

  let state: EditorState = createState({
    doc: createDoc(contentSchema, root),
    plugins: [codeHighlightPlugin()],
  });

  let laid: BlockDecorations = new Map();
  let spent = 0;
  let shown = 0;

  const show = (tr: Transaction): void => {
    const started = performance.now();

    state = state.apply(tr);

    const next = blockDecorations(state, decorationSets(state));

    changedBlocks(laid, next);
    laid = next;
    spent += performance.now() - started;
    shown += 1;
  };

  const painter = createCodeHighlighter(
    () => highlighter,
    show,
    () => state,
  );

  const settle = async (): Promise<void> => {
    painter.update(state);
    await promiseTimeout(0);
    await promiseTimeout(0);
  };

  for (let round = 0; round < blocks / 10; round += 1) {
    await settle();
  }

  return {
    get laid() {
      return laid;
    },
    typeInto: async (id: string): Promise<Typed> => {
      spent = 0;
      shown = 0;
      show(state.tr.insertText('x', (state.doc.positionOf(id) ?? 0) + 5));
      await settle();
      return { spent, shown };
    },
    stop: () => {
      painter.stop();
    },
  };
};

describe('code highlight', () => {
  it('follows typing and repainting in one of many painted code blocks within a frame', async () => {
    const book = await paintedBook(300);
    const typed: Typed[] = [];

    expect(book.laid.size).toBe(300);

    for (let key = 0; key < 20; key += 1) {
      typed.push(await book.typeInto('c150'));
    }

    book.stop();

    expect(typed.map(({ shown }) => shown)).toEqual(typed.map(() => 2));

    expect(
      typed.map(({ spent }) => spent).toSorted((left, right) => left - right)[10],
    ).toBeLessThan(16);
  });
});
