import { describe, expect, it } from 'vite-plus/test';
import {
  blockDecoration,
  commentAnchors,
  createDoc,
  createState,
  decorationSet,
  definePlugin,
  inlineDecoration,
  setAnchor,
  type EditorState,
} from '../src';
import { fixtureSchema } from '../src/fixtures';
import { blockDecorations, changedBlocks, decorationSets } from '../src/view/decorate';

const TOKENS = 40;

const paragraph = (id: string, text: string) =>
  fixtureSchema.element('paragraph', { id, content: [fixtureSchema.text(text)] });

const painted = decorationSet(
  [],
  ['p1', 'p2'].flatMap((block) =>
    Array.from({ length: TOKENS }, (_unused, index) =>
      blockDecoration(block, index, index + 1, 'token'),
    ),
  ),
);

const paint = definePlugin({ name: 'paint', props: { decorations: () => painted } });

const commented = (): EditorState => {
  const start = createState({
    doc: createDoc(
      fixtureSchema,
      fixtureSchema.element(fixtureSchema.top.name, {
        id: 'root',
        content: ['p0', 'p1', 'p2'].map((id) => paragraph(id, 'x'.repeat(TOKENS))),
      }),
    ),
    plugins: [paint, commentAnchors],
  });

  let state = start;

  setAnchor('note', { kind: 'text', from: 4, to: 9 })(start, (tr) => {
    state = start.apply(tr);
  });

  return state;
};

describe('decorations laid over blocks', () => {
  it('leaves the blocks of an unchanged set alone when another set moves', () => {
    const state = commented();
    const before = blockDecorations(state, decorationSets(state));
    const typed = state.apply(state.tr.insertText('y', 2));

    const after = blockDecorations(typed, decorationSets(typed));

    expect(after.get('p1')).toBe(before.get('p1'));
    expect(after.get('p2')).toBe(before.get('p2'));
    expect(changedBlocks(before, after)).toEqual(['p0']);
    expect(after.get('p0')).toEqual([{ from: 4, to: 9, class: expect.any(String), tag: 'mark' }]);
  });

  it('places a range anew when the document under an unchanged set moves', () => {
    const fixed = decorationSet([inlineDecoration(44, 46, 'late')]);
    const late = definePlugin({ name: 'late', props: { decorations: () => fixed } });

    const state = createState({ doc: commented().doc, plugins: [late] });
    const typed = state.apply(state.tr.insertText('yyyy', 2));

    expect(blockDecorations(state, decorationSets(state)).get('p1')).toEqual([
      { from: 1, to: 3, class: 'late', tag: 'span' },
    ]);

    expect(blockDecorations(typed, decorationSets(typed)).get('p0')).toEqual([
      { from: 43, to: 44, class: 'late', tag: 'span' },
    ]);
  });

  it('merges the decorations two sets put on one block', () => {
    const marked = decorationSet([], [blockDecoration('p1', 0, 5, 'found')]);
    const find = definePlugin({ name: 'find', props: { decorations: () => marked } });
    const state = createState({ doc: commented().doc, plugins: [paint, find] });

    const blocks = blockDecorations(state, decorationSets(state));

    expect(blocks.get('p1')).toHaveLength(TOKENS + 1);
    expect(blocks.get('p1')?.at(-1)).toEqual({ from: 0, to: 5, class: 'found', tag: 'span' });
    expect(blocks.get('p2')).toHaveLength(TOKENS);
  });
});
