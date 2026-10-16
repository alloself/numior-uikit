import { afterEach, describe, expect, it } from 'vite-plus/test';
import { addToHistory, redoDepth, textSelection, undoDepth } from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

let harness: EditingHarness | undefined;

const blank = (): EditingHarness => {
  harness = EditingHarness.of(doc(node('paragraph')), textSelection(1));
  return harness;
};

afterEach(() => {
  harness?.release();
  harness = undefined;
});

describe('editor history', () => {
  it('groups typing until a pause and steps back and forth with the keyboard', () => {
    const editor = blank();

    editor.type('abc');
    editor.pause(1000);
    editor.type('de');

    expect(undoDepth(editor.state)).toBe(2);
    expect(editor.press('Mod-z')).toBe(true);
    expect(editor.outline).toBe('paragraph("abc")');
    expect(editor.selection).toEqual(textSelection(4));

    editor.press('Mod-z');

    expect(editor.outline).toBe('paragraph()');
    expect(editor.press('Mod-z')).toBe(false);
    expect(redoDepth(editor.state)).toBe(2);

    editor.press('Mod-Shift-z');

    expect(editor.outline).toBe('paragraph("abc")');

    editor.press('Mod-y');

    expect(editor.outline).toBe('paragraph("abcde")');
    expect(editor.selection).toEqual(textSelection(6));
  });

  it('starts a new step for another kind of input, a moved cursor or a fired rule', () => {
    const editor = blank();

    editor.type('ab');
    editor.backspace();
    editor.select(textSelection(1));
    editor.type('c');
    editor.press('Mod-z');

    expect(editor.outline).toBe('paragraph("a")');

    editor.press('Mod-z');

    expect(editor.outline).toBe('paragraph("ab")');

    editor.press('Mod-z');

    expect(editor.outline).toBe('paragraph()');

    editor.type('# a');
    editor.press('Mod-z');

    expect(editor.outline).toBe('heading()');

    editor.press('Mod-z');

    expect(editor.outline).toBe('paragraph("#")');
  });

  it('forgets the redo branch after a new edit and answers undo requests from the input', () => {
    const editor = blank();

    editor.type('ab');
    editor.intent({ kind: 'history', action: 'undo' });

    expect(editor.outline).toBe('paragraph()');

    editor.type('c');

    expect(editor.press('Mod-Shift-z')).toBe(false);
    expect(editor.press('Mod-я', 'KeyZ')).toBe(true);
    expect(editor.outline).toBe('paragraph()');
  });

  it('maps its steps over changes kept out of the history', () => {
    const editor = blank();

    editor.type('ab');
    editor.change((tr) => tr.insertText('X', 1).setMeta(addToHistory, false));

    expect(editor.outline).toBe('paragraph("Xab")');

    editor.press('Mod-z');

    expect(editor.outline).toBe('paragraph("X")');
  });
});
