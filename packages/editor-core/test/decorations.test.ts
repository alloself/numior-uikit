import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  createMetaKey,
  decorationSet,
  definePlugin,
  inlineDecoration,
  type DecorationSet,
  type InlineDecoration,
  type Plugin,
} from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditorViewDriver } from './drivers/view';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

const paint = createMetaKey<DecorationSet>('paint');

const painter = (initial: readonly InlineDecoration[]) => {
  const plugin: Plugin<DecorationSet> = definePlugin<DecorationSet>({
    name: 'painter',
    state: {
      init: () => decorationSet(initial),
      apply: (tr, value) => tr.getMeta(paint) ?? value.map(tr.mapping),
    },
    props: { decorations: (state): DecorationSet | undefined => plugin.getState(state) },
  });

  return plugin;
};

let driver: EditorViewDriver | undefined;

const mounted = (decorations: readonly InlineDecoration[]): EditorViewDriver => {
  driver = EditorViewDriver.mount(
    doc(node('paragraph', ['let value = 1']), node('paragraph', ['plain'])),
    fixtureSchema,
    [painter(decorations)],
  );

  return driver;
};

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

const TOKENS = [inlineDecoration(1, 4, 'kw'), inlineDecoration(5, 10, 'var')];

describe('editor view decorations', () => {
  it('paints classes on text ranges without touching the document or the positions', () => {
    const view = mounted(TOKENS);

    expect(view.markup).toBe(
      '<p><span><span class="kw">let</span> <span class="var">value</span> = 1</span></p><p>plain</p>',
    );

    expect(view.modelTexts).toEqual(['let value = 1', 'plain']);

    expect(Array.from({ length: 14 }, (_, offset) => view.roundTrip(offset + 1))).toEqual(
      Array.from({ length: 14 }, (_, offset) => offset + 1),
    );

    expect(view.positionAt('.var', 1)).toBe(10);
  });

  it('keeps typed text inside a decoration and maps it through the change', () => {
    const view = mounted(TOKENS);

    view.focus();
    view.place(3);
    view.type('x');

    expect(view.modelTexts).toEqual(['lext value = 1', 'plain']);
    expect(view.markup).toContain('<span class="kw">lext</span>');
    expect(view.selection).toEqual({ kind: 'text', anchor: 4, head: 4 });
  });

  it('redraws only the block whose decorations change and leaves the others alone', () => {
    const view = mounted(TOKENS);

    view.remember();
    view.change((tr) => tr.setMeta(paint, decorationSet([inlineDecoration(11, 12, 'op')])));

    expect(view.markup).toBe(
      '<p><span>let value <span class="op">=</span> 1</span></p><p>plain</p>',
    );

    expect(view.keptBlocks).toEqual([true, true]);
    view.change((tr) => tr.setMeta(paint, decorationSet([])));
    expect(view.markup).toBe('<p>let value = 1</p><p>plain</p>');
  });

  it('holds new decorations while a composition runs and paints them with the next change', () => {
    const view = mounted(TOKENS);

    view.startComposition();
    view.change((tr) => tr.setMeta(paint, decorationSet([])));
    expect(view.markup).toContain('<span class="kw">let</span>');
    view.endComposition();
    view.change((tr) => tr);
    expect(view.markup).toBe('<p>let value = 1</p><p>plain</p>');
  });
});
