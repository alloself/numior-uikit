import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  activateAnchor,
  anchorFromJSON,
  anchorToJSON,
  anchorsAt,
  anchorsOf,
  baseKeymap,
  commentAnchors,
  history,
  keymap,
  remoteChange,
  removeAnchor,
  setAnchor,
  textSelection,
  type EditorState,
} from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditingHarness } from './harness/editing';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

let harness: EditingHarness | undefined;

const editing = (): EditingHarness => {
  harness = EditingHarness.of(
    doc(node('paragraph', ['hello world']), node('divider'), node('paragraph', ['end'])),
    textSelection(7, 12),
    [commentAnchors, keymap(baseKeymap), history()],
  );

  return harness;
};

const spans = (state: EditorState): string[] =>
  (commentAnchors.props.decorations?.(state)?.decorations ?? []).map(
    (decoration) =>
      `${state.doc.textBetween(decoration.from, decoration.to, '|')}:${decoration.tag}:${decoration.class}`,
  );

const rangeOf = (state: EditorState, id: string): string => {
  const anchor = anchorsOf(state).get(id);

  return anchor === undefined
    ? 'none'
    : `${anchor.range.kind === 'text' ? state.doc.textBetween(anchor.range.from, anchor.range.to, '|') : anchor.range.id}${anchor.lost ? ' lost' : ''}`;
};

afterEach(() => {
  harness?.release();
  harness = undefined;
});

describe('comment anchors', () => {
  it('anchors the selection and follows edits inside it but not at its edges', () => {
    const editor = editing();

    expect(editor.run(setAnchor('c1'))).toBe(true);
    expect(spans(editor.state)).toEqual(['world:mark:nui-editor__comment']);

    editor.select(textSelection(9));
    editor.type('X');
    editor.select(textSelection(7));
    editor.type('<');
    editor.select(textSelection(14));
    editor.type('>');

    expect(rangeOf(editor.state, 'c1')).toBe('woXrld');
    expect(editor.outline).toBe('paragraph("hello <woXrld>") divider paragraph("end")');
  });

  it('shrinks with deleted text, keeps a lost anchor and follows remote edits and undo', () => {
    const editor = editing();

    editor.run(setAnchor('c1'));
    editor.change((tr) => tr.insertText('Hey, ', 1).setMeta(remoteChange, true));

    expect(rangeOf(editor.state, 'c1')).toBe('world');

    editor.select(textSelection(12, 14));
    editor.backspace();

    expect(rangeOf(editor.state, 'c1')).toBe('rld');

    editor.press('Mod-z');

    expect(editor.outline).toBe('paragraph("Hey, hello world") divider paragraph("end")');
    expect(rangeOf(editor.state, 'c1')).toBe('rld');

    editor.select(textSelection(10, 17));
    editor.backspace();

    expect(rangeOf(editor.state, 'c1')).toBe(' lost');
    expect(spans(editor.state)).toEqual([]);
  });

  it('marks the active anchor, finds anchors at a position and removes them', () => {
    const editor = editing();
    const rule = editor.state.doc.root.content[1];
    const ruleId = rule?.kind === 'element' ? rule.id : '';

    editor.run(setAnchor('c1'));
    editor.run(setAnchor('c2', { kind: 'node', id: ruleId }));
    editor.run(activateAnchor('c1'));

    expect(spans(editor.state)).toEqual([
      'world:mark:nui-editor__comment nui-editor__comment--active',
    ]);

    expect(anchorsAt(editor.state, 9)).toEqual(['c1']);
    expect(anchorsAt(editor.state, 14)).toEqual(['c2']);
    expect(editor.run(activateAnchor('missing'))).toBe(false);

    editor.change((tr) => tr.delete(13, 14));

    expect(rangeOf(editor.state, 'c2')).toBe(`${ruleId} lost`);
    expect(editor.run(removeAnchor('c1'))).toBe(true);
    expect(editor.run(removeAnchor('c1'))).toBe(false);
    expect(spans(editor.state)).toEqual([]);
  });

  it('writes anchors as block ids with offsets and reads them back', () => {
    const editor = editing();

    editor.run(setAnchor('c1'));

    const anchor = anchorsOf(editor.state).get('c1');
    const json = anchor === undefined ? undefined : anchorToJSON(editor.state.doc, anchor.range);
    const first = editor.state.doc.root.content[0];
    const firstId = first?.kind === 'element' ? first.id : '';

    expect(json).toEqual({
      kind: 'text',
      fromId: firstId,
      fromOffset: 6,
      toId: firstId,
      toOffset: 11,
    });

    expect(json === undefined ? undefined : anchorFromJSON(editor.state.doc, json)).toEqual(
      anchor?.range,
    );

    expect(
      anchorFromJSON(editor.state.doc, {
        kind: 'text',
        fromId: 'gone',
        fromOffset: 0,
        toId: firstId,
        toOffset: 1,
      }),
    ).toBeUndefined();

    expect(
      anchorFromJSON(editor.state.doc, {
        kind: 'text',
        fromId: firstId,
        fromOffset: 4,
        toId: firstId,
        toOffset: 99,
      }),
    ).toBeUndefined();

    expect(editor.run(setAnchor('c2', undefined))).toBe(true);

    editor.select(textSelection(3));
    expect(editor.run(setAnchor('c3'))).toBe(false);
  });
});
