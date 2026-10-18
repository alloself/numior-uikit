import * as fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { inlineText, remoteChange, textSelection, undoDepth, type EditorState } from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

let harness: EditingHarness | undefined;

const twoLines = (caret = 4): EditingHarness => {
  harness?.release();

  harness = EditingHarness.of(
    doc(node('paragraph', ['one']), node('paragraph', ['two'])),
    textSelection(caret),
  );

  return harness;
};

const secondLine = (state: EditorState): number => {
  const first = state.doc.root.content[0];

  return first?.kind === 'element' ? first.size : 0;
};

const remote = (editor: EditingHarness, at: number, text: string): void => {
  editor.change((tr) => tr.insertText(text, at).setMeta(remoteChange, true));
};

const undoAll = (editor: EditingHarness): void => {
  while (editor.press('Mod-z')) {
    editor.pause(1);
  }
};

afterEach(() => {
  harness?.release();
  harness = undefined;
});

describe('history over remote changes', () => {
  it('undoes and redoes only local edits around a remote change in another block', () => {
    const editor = twoLines();

    editor.type(' A');
    editor.pause(1000);
    remote(editor, secondLine(editor.state) + 1, 'X');
    editor.type(' B');
    editor.press('Mod-z');

    expect(editor.outline).toBe('paragraph("one A") paragraph("Xtwo")');

    editor.press('Mod-z');

    expect(editor.outline).toBe('paragraph("one") paragraph("Xtwo")');

    editor.press('Mod-Shift-z');
    editor.press('Mod-Shift-z');

    expect(editor.outline).toBe('paragraph("one A B") paragraph("Xtwo")');
  });

  it('keeps a remote change in the same line and the caret on its own text', () => {
    const editor = twoLines();

    editor.type('abc');
    remote(editor, 1, 'Z');
    editor.press('Mod-z');

    expect(editor.outline).toBe('paragraph("Zone") paragraph("two")');
    expect(editor.selection).toEqual(textSelection(5));
  });

  it('forgets a local edit whose text a remote change removed', () => {
    const editor = twoLines();

    editor.type('abc');
    editor.change((tr) => tr.delete(4, 7).setMeta(remoteChange, true));

    expect(undoDepth(editor.state)).toBe(0);
    expect(editor.press('Mod-z')).toBe(false);
    expect(editor.outline).toBe('paragraph("one") paragraph("two")');
  });

  it('takes back every local edit in a line that remote edits change at the same time', () => {
    const turn = fc.record({
      remote: fc.boolean(),
      offset: fc.nat(),
      text: fc.string({ minLength: 1, maxLength: 3, unit: fc.constantFrom('a', 'b') }),
      remove: fc.nat({ max: 2 }),
    });

    fc.assert(
      fc.property(fc.array(turn, { maxLength: 12 }), (turns) => {
        const editor = twoLines();

        for (const step of turns) {
          const line = secondLine(editor.state) - 2;
          const at = 1 + (step.offset % (line + 1));

          if (step.remote) {
            remote(editor, at, step.text.replaceAll(/[ab]/gu, 'x'));
          } else {
            editor.change((tr) =>
              tr.insertText(step.text, at, Math.min(at + step.remove, line + 1)),
            );
          }
          editor.pause(1000);
        }
        undoAll(editor);

        const first = editor.state.doc.root.content[0];
        const text = first?.kind === 'element' ? inlineText(first) : '';

        expect(text.replaceAll('x', '')).toBe('one');
      }),
      { numRuns: 300 },
    );
  });

  it('returns to the remote document after undoing any mix of local edits', () => {
    const local = fc.record({
      offset: fc.nat(),
      text: fc.string({ minLength: 1, maxLength: 3, unit: fc.constantFrom('a', 'b', 'c') }),
      remove: fc.nat({ max: 2 }),
    });

    const turn = fc.oneof(
      local.map((edit) => ({ kind: 'local' as const, ...edit })),
      fc
        .string({ minLength: 1, maxLength: 2, unit: fc.constantFrom('x', 'y') })
        .map((text) => ({ kind: 'remote' as const, text })),
    );

    fc.assert(
      fc.property(fc.array(turn, { maxLength: 12 }), (turns) => {
        const editor = twoLines();
        let incoming = '';

        for (const step of turns) {
          const line = secondLine(editor.state) - 2;

          if (step.kind === 'remote') {
            remote(editor, secondLine(editor.state) + 1, step.text);
            incoming = `${step.text}${incoming}`;
          } else {
            const at = 1 + (step.offset % (line + 1));
            const end = Math.min(at + step.remove, line + 1);

            editor.change((tr) => tr.insertText(step.text, at, end));
          }
          editor.pause(1000);
        }
        undoAll(editor);

        expect(editor.outline).toBe(`paragraph("one") paragraph("${incoming}two")`);
      }),
      { numRuns: 200 },
    );
  });
});
