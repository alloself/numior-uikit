import * as fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { inlineText, remoteChange, textSelection, undoDepth, type EditorState } from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

let harness: EditingHarness | undefined;

const REMOTE_BUDGET = 150;

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

const remoteCut = (editor: EditingHarness, from: number, to: number): void => {
  editor.change((tr) => tr.delete(from, to).setMeta(remoteChange, true));
};

const lineTexts = (state: EditorState): readonly string[] =>
  state.doc.root.content.map((block) => (block.kind === 'element' ? inlineText(block) : ''));

const noteLetters = (letters: Set<string> | undefined, text: string): void => {
  for (const letter of text) {
    letters?.add(letter);
  }
};

const keptLine = (original: string, theirs: ReadonlySet<string> | undefined): string =>
  original
    .split('')
    .filter((letter) => theirs?.has(letter) !== true)
    .join('');

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

  it('takes back typing that a later deletion of mine covered, after someone else wrote elsewhere', () => {
    const editor = twoLines(6);

    editor.type('ab');
    editor.pause(1000);
    editor.change((tr) => tr.delete(6, 9));
    editor.pause(1000);
    remote(editor, 1, 'X');
    editor.press('Mod-z');

    expect(editor.outline).toBe('paragraph("Xone") paragraph("abtwo")');

    editor.press('Mod-z');

    expect(editor.outline).toBe('paragraph("Xone") paragraph("two")');
  });

  it('leaves only what others wrote after undoing any mix of my typing and deleting', () => {
    const turn = fc.record({
      kind: fc.constantFrom('type', 'type', 'delete', 'pause', 'remote', 'remote'),
      offset: fc.nat(),
      length: fc.integer({ min: 1, max: 4 }),
    });

    fc.assert(
      fc.property(fc.array(turn, { minLength: 3, maxLength: 25 }), (turns) => {
        const editor = twoLines();

        for (const step of turns) {
          const size = editor.state.doc.size;
          const at = editor.nearestText(step.offset % (size + 1));
          const end = editor.endOfTextAfter(at, step.length);

          switch (step.kind) {
            case 'type':
              editor.select(textSelection(at));
              editor.type('a'.repeat(step.length));
              break;
            case 'delete':
              editor.change((tr) => (end > at ? tr.delete(at, end) : tr));
              break;
            case 'pause':
              editor.pause(1000);
              break;
            default:
              remote(editor, at, 'x'.repeat(step.length));
          }
        }
        undoAll(editor);

        expect(editor.outline.replaceAll('x', '')).toBe('paragraph("one") paragraph("two")');
      }),
      { numRuns: 400 },
    );
  });

  it('takes back all my typing after someone else deleted the text around what was left of it', () => {
    const editor = twoLines(1);

    editor.type('aa');
    remoteCut(editor, 3, 6);
    editor.change((tr) => tr.delete(2, 3));
    remoteCut(editor, 1, 2);
    undoAll(editor);

    expect(editor.outline).toBe('paragraph() paragraph("two")');
  });

  it('puts the letters I deleted around a letter someone else deleted back in their order', () => {
    const editor = twoLines();

    editor.change((tr) => tr.delete(1, 2));
    editor.change((tr) => tr.delete(2, 3));
    remoteCut(editor, 1, 2);
    undoAll(editor);

    expect(editor.outline).toBe('paragraph("oe") paragraph("two")');
  });

  it('brings back a letter I deleted after someone else deleted the letters around its place', () => {
    const editor = twoLines();

    editor.change((tr) => tr.delete(2, 3));
    remoteCut(editor, 1, 3);
    undoAll(editor);

    expect(editor.outline).toBe('paragraph("n") paragraph("two")');
  });

  it('leaves exactly what others did after undoing my edits around the text they deleted', () => {
    const original = ['one', 'two'];

    const turn = fc.record({
      kind: fc.constantFrom('type', 'type', 'delete', 'retype', 'pause', 'remote', 'cut'),
      offset: fc.nat(),
      length: fc.integer({ min: 1, max: 4 }),
    });

    fc.assert(
      fc.property(fc.array(turn, { minLength: 3, maxLength: 25 }), (turns) => {
        const editor = twoLines();
        const theirs = [new Set<string>(), new Set<string>()];

        for (const step of turns) {
          const at = editor.nearestText(step.offset % (editor.state.doc.size + 1));
          const end = editor.endOfTextAfter(at, step.length);
          const line = at < secondLine(editor.state) ? 0 : 1;
          const text = editor.state.doc.textBetween(at, end);

          switch (step.kind) {
            case 'type':
              editor.select(textSelection(at));
              editor.type('a'.repeat(step.length));
              break;
            case 'delete':
              editor.change((tr) => (end > at ? tr.delete(at, end) : tr));
              break;
            case 'retype':
              editor.select(textSelection(at, end));
              editor.type('a');
              break;
            case 'pause':
              editor.pause(1000);
              break;
            case 'remote':
              remote(editor, at, 'x'.repeat(step.length));
              break;
            default:
              noteLetters(theirs[line], text);
              remoteCut(editor, at, Math.max(at, end));
          }
        }
        undoAll(editor);

        const kept = lineTexts(editor.state).map((line) => line.replaceAll('x', ''));

        expect(kept).toEqual(original.map((line, index) => keptLine(line, theirs[index])));
      }),
      { numRuns: 500 },
    );
  });

  it(
    'takes a change from someone else in the same time whatever the undo history holds',
    { tags: ['budget'] },
    () => {
      const editor = twoLines();

      for (let run = 0; run < 100; run += 1) {
        editor.type('abcdefghijklmnopqrstuvwxyz');
        editor.pause(1000);
      }

      const started = performance.now();

      for (let change = 0; change < 50; change += 1) {
        remote(editor, secondLine(editor.state) + 1, 'X');
      }

      expect(performance.now() - started).toBeLessThan(REMOTE_BUDGET);
      expect(undoDepth(editor.state)).toBe(100);
    },
  );
});
