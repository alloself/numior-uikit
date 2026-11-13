import * as fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  anchorsOf,
  baseKeymap,
  commentAnchors,
  history,
  keymap,
  redo,
  remoteChange,
  setAnchor,
  textSelection,
  undo,
  undoDepth,
  type EditorState,
} from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

type Edit =
  | { readonly kind: 'type'; readonly at: number; readonly text: string }
  | { readonly kind: 'erase'; readonly from: number; readonly size: number }
  | { readonly kind: 'backspace'; readonly at: number; readonly times: number }
  | { readonly kind: 'peer'; readonly at: number; readonly text: string }
  | { readonly kind: 'undo' | 'redo' | 'pause' };

const { doc, node } = buildWith(fixtureSchema);

const LINE = 'hello world';

let harness: EditingHarness | undefined;

const editing = (): EditingHarness => {
  harness = EditingHarness.of(
    doc(node('paragraph', [LINE]), node('divider'), node('paragraph', ['end'])),
    textSelection(7, 12),
    [commentAnchors, keymap(baseKeymap), history()],
  );

  harness.run(setAnchor('c1'));
  return harness;
};

const commented = (state: EditorState): string => {
  const anchor = anchorsOf(state).get('c1');

  return anchor?.range.kind === 'text' && !anchor.lost
    ? state.doc.textBetween(anchor.range.from, anchor.range.to, '|')
    : 'lost';
};

const lineSize = (state: EditorState): number | undefined => {
  const line = state.doc.root.content[0];

  return line?.kind === 'element' && line.type === 'paragraph'
    ? line.content.reduce(
        (size, child) => size + (child.kind === 'text' ? child.text.length : 0),
        0,
      )
    : undefined;
};

const undoAll = (editor: EditingHarness): void => {
  while (undoDepth(editor.state) > 0) {
    editor.run(undo);
  }
};

const PLAIN = {
  undo: (editor: EditingHarness): void => {
    editor.run(undo);
  },
  redo: (editor: EditingHarness): void => {
    editor.run(redo);
  },
  pause: (editor: EditingHarness): void => {
    editor.pause(5000);
  },
} as const;

const erase = (editor: EditingHarness, from: number, size: number, line: number): void => {
  editor.select(textSelection(from, Math.min(line + 1, from + size)));
  editor.backspace();
};

const backspaceAt = (editor: EditingHarness, at: number, times: number): void => {
  editor.select(textSelection(at));

  for (let time = 0; time < times; time += 1) {
    editor.backspace();
  }
};

const play = (editor: EditingHarness, edit: Edit): void => {
  const size = lineSize(editor.state);

  if (size === undefined) {
    return;
  }

  const placeOf = (offset: number): number => 1 + (offset % (size + 1));

  switch (edit.kind) {
    case 'type':
      editor.select(textSelection(placeOf(edit.at)));
      editor.type(edit.text);
      break;
    case 'erase':
      erase(editor, placeOf(edit.from), edit.size, size);
      break;
    case 'backspace':
      backspaceAt(editor, placeOf(edit.at), edit.times);
      break;
    case 'peer':
      editor.change((tr) => tr.insertText(edit.text, placeOf(edit.at)).setMeta(remoteChange, true));
      break;
    default:
      PLAIN[edit.kind](editor);
  }
};

const edits = fc.oneof(
  fc.record({
    kind: fc.constant('type' as const),
    at: fc.nat(40),
    text: fc.constantFrom('a', 'bc', 'world', 'o'),
  }),
  fc.record({
    kind: fc.constant('erase' as const),
    from: fc.nat(40),
    size: fc.integer({ min: 1, max: 8 }),
  }),
  fc.record({
    kind: fc.constant('backspace' as const),
    at: fc.nat(40),
    times: fc.integer({ min: 1, max: 6 }),
  }),
  fc.record({
    kind: fc.constant('peer' as const),
    at: fc.nat(40),
    text: fc.constantFrom('Z', 'ZZ'),
  }),
  fc.record({ kind: fc.constantFrom('undo' as const, 'redo' as const, 'pause' as const) }),
);

afterEach(() => {
  harness?.release();
  harness = undefined;
});

describe('comment anchors through undo', () => {
  it('brings a comment back when the removal of its text is undone and drops it on redo', () => {
    const editor = editing();

    editor.backspace();
    expect(commented(editor.state)).toBe('lost');

    editor.run(undo);
    expect(commented(editor.state)).toBe('world');

    editor.run(redo);
    expect(commented(editor.state)).toBe('lost');

    editor.run(undo);
    expect(commented(editor.state)).toBe('world');
  });

  it('gives a comment its whole text back when only a part of it was removed', () => {
    const editor = editing();

    editor.select(textSelection(5, 9));
    editor.backspace();
    expect(commented(editor.state)).toBe('rld');

    editor.run(undo);

    expect(commented(editor.state)).toBe('world');
  });

  it('brings back a comment erased letter by letter, one stretch of erasing at a time', () => {
    const editor = editing();

    editor.select(textSelection(12));
    editor.backspace();
    editor.backspace();
    editor.pause(5000);
    editor.backspace();
    editor.backspace();
    editor.backspace();
    expect(commented(editor.state)).toBe('lost');

    editor.run(undo);
    expect(commented(editor.state)).toBe('wor');

    editor.run(undo);
    expect(commented(editor.state)).toBe('world');
  });

  it('brings back a comment erased forwards from its start', () => {
    const editor = editing();

    editor.select(textSelection(7));
    editor.deleteForward();
    editor.deleteForward();
    editor.deleteForward();
    editor.deleteForward();
    editor.deleteForward();
    expect(commented(editor.state)).toBe('lost');

    undoAll(editor);

    expect(commented(editor.state)).toBe('world');
  });

  it('brings back a comment whose text was typed over', () => {
    const editor = editing();

    editor.type('X');
    expect(commented(editor.state)).toBe('lost');

    undoAll(editor);

    expect(editor.outline).toBe('paragraph("hello world") divider paragraph("end")');
    expect(commented(editor.state)).toBe('world');
  });

  it('puts back the parts of a comment removed at different times in any order of undo', () => {
    const editor = editing();

    editor.select(textSelection(9, 10));
    editor.backspace();
    editor.select(textSelection(7, 11));
    editor.backspace();
    expect(commented(editor.state)).toBe('lost');

    editor.run(undo);
    expect(commented(editor.state)).toBe('wold');

    editor.run(undo);
    expect(commented(editor.state)).toBe('world');
  });

  it('brings back a comment removed together with the lines around it', () => {
    const editor = editing();

    editor.select(textSelection(3, 16));
    editor.backspace();
    expect(commented(editor.state)).toBe('lost');

    undoAll(editor);

    expect(editor.outline).toBe('paragraph("hello world") divider paragraph("end")');
    expect(commented(editor.state)).toBe('world');
  });

  it('leaves a comment lost when its text comes back by any way other than undo', () => {
    const editor = editing();

    editor.change((tr) => tr.delete(7, 12).setMeta(remoteChange, true));
    editor.change((tr) => tr.insertText('world', 7).setMeta(remoteChange, true));
    expect(commented(editor.state)).toBe('lost');

    editor.select(textSelection(7, 12));
    editor.backspace();
    editor.type('world');

    expect(commented(editor.state)).toBe('lost');
  });

  it('brings a comment back after another person typed where its text used to be', () => {
    const editor = editing();

    editor.backspace();
    editor.change((tr) => tr.insertText('big ', 7).setMeta(remoteChange, true));
    editor.run(undo);

    expect(editor.outline).toBe('paragraph("hello big world") divider paragraph("end")');
    expect(commented(editor.state)).toBe('world');
  });

  it('covers the same text again after any edits of the line are undone', () => {
    fc.assert(
      fc.property(fc.array(edits, { minLength: 1, maxLength: 18 }), (turns) => {
        const editor = editing();

        for (const turn of turns) {
          play(editor, turn);
        }

        undoAll(editor);

        expect(editor.outline.replaceAll('Z', '')).toBe(
          'paragraph("hello world") divider paragraph("end")',
        );

        expect(commented(editor.state).replaceAll('Z', '')).toBe('world');
        editor.release();
      }),
      { numRuns: 400 },
    );
  });
});
