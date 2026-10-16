import { afterEach, describe, expect, it } from 'vite-plus/test';
import { createSuggestion, textSelection, type KeyInput } from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

let harness: EditingHarness | undefined;

const keys: string[] = [];

const slash = createSuggestion({
  name: 'slash',
  char: '/',
  onKey: (key: KeyInput, match) => {
    keys.push(`${key.key}:${match.query}`);
    return key.key === 'Enter';
  },
});

const started = (text: string, at: number): EditingHarness => {
  harness = EditingHarness.of(
    doc(node('paragraph', text === '' ? [] : [text])),
    textSelection(at),
    [slash.plugin],
  );

  return harness;
};

afterEach(() => {
  harness?.release();
  harness = undefined;
  keys.length = 0;
});

describe('suggestions', () => {
  it('matches the trigger at the start of a block or after a space up to the cursor', () => {
    const editor = started('', 1);

    editor.type('/hea');

    expect(slash.match(editor.state)).toEqual({ from: 1, to: 5, query: 'hea' });

    editor.type(' x');

    expect(slash.match(editor.state)).toBeUndefined();

    const inside = started('a/b c /d', 9);

    expect(slash.match(inside.state)).toEqual({ from: 7, to: 9, query: 'd' });

    inside.select(textSelection(4));

    expect(slash.match(inside.state)).toBeUndefined();
  });

  it('hands keys to the menu while it matches and stays dismissed until the trigger goes', () => {
    const editor = started('', 1);

    editor.type('/');

    expect(editor.press('ArrowDown')).toBe(false);
    expect(editor.press('Enter')).toBe(true);
    expect(keys).toEqual(['ArrowDown:', 'Enter:']);

    expect(slash.dismiss(editor.state, (tr) => editor.change(() => tr))).toBe(true);
    editor.type('x');

    expect(slash.match(editor.state)).toBeUndefined();
    expect(slash.dismiss(editor.state)).toBe(false);

    editor.backspace();
    editor.backspace();
    editor.type('/');

    expect(slash.match(editor.state)?.query).toBe('');
  });

  it('stays quiet in code blocks and over ranges', () => {
    harness = EditingHarness.of(doc(node('code_block', ['/x'])), textSelection(3), [slash.plugin]);

    expect(slash.match(harness.state)).toBeUndefined();

    harness.select(textSelection(1, 3));

    expect(slash.match(harness.state)).toBeUndefined();
  });
});
