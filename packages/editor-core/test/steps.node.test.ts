import { describe, expect, it } from 'vite-plus/test';
import {
  applyStep,
  createDoc,
  invertStep,
  mapStep,
  mergeSteps,
  stepMapOf,
  type Doc,
  type Slice,
  type Step,
} from '../src';
import { buildWith, notes } from './support/notes';

const { doc, node, text } = buildWith();

const page = (): Doc =>
  createDoc(
    notes,
    doc(
      node('paragraph', ['Hello']),
      node('paragraph', ['World']),
      node('list', [node('item', [node('paragraph', ['ab'])])]),
    ),
  );

const flatSlice = (...content: Slice['content']): Slice => ({ content, openStart: 0, openEnd: 0 });

const applied = (target: Doc, step: Step): Doc => {
  const result = applyStep(target, step);

  if (!result.ok) {
    throw new Error(`step failed: ${result.reason}`);
  }
  return result.doc;
};

const roundTrip = (target: Doc, step: Step): Doc =>
  applied(applied(target, step), invertStep(step, target));

const insert = (pos: number): Step => ({
  kind: 'replace',
  from: pos,
  to: pos,
  slice: flatSlice(text('ab')),
});

describe('replace steps', () => {
  it('inserts, deletes and replaces text inside a paragraph', () => {
    const start = page();
    const typed = applied(start, { kind: 'replace', from: 6, to: 6, slice: flatSlice(text('!')) });

    expect(typed.textBetween(0, typed.size)).toBe('Hello!\nWorld\nab');

    expect(typed.root.content[0]).toMatchObject({
      id: start.root.content[0]?.kind === 'element' ? start.root.content[0].id : '',
      size: 8,
    });

    expect(
      applied(start, { kind: 'replace', from: 2, to: 4, slice: flatSlice() }).textBetween(0, 20),
    ).toBe('Hlo\nWorld\nab');

    expect(
      roundTrip(start, { kind: 'replace', from: 2, to: 4, slice: flatSlice(text('EL')) }).root,
    ).toEqual(start.root);
  });

  it('splits a paragraph with an open slice and joins two paragraphs by deleting their boundary', () => {
    const start = page();
    const second = node('paragraph');

    const split = applied(start, {
      kind: 'replace',
      from: 3,
      to: 3,
      slice: { content: [node('paragraph'), second], openStart: 1, openEnd: 1 },
    });

    expect(split.root.content.map((block) => (block.kind === 'element' ? block.id : ''))).toContain(
      second.id,
    );

    expect(split.textBetween(0, split.size)).toBe('He\nllo\nWorld\nab');

    const joined = applied(start, { kind: 'replace', from: 6, to: 8, slice: flatSlice() });

    expect(joined.textBetween(0, joined.size)).toBe('HelloWorld\nab');
    expect(joined.root.content).toHaveLength(2);

    expect(roundTrip(start, { kind: 'replace', from: 6, to: 8, slice: flatSlice() }).root).toEqual(
      start.root,
    );
  });

  it('restores a range from its own slice and keeps the ids of the cut nodes', () => {
    const start = page();
    const slice = start.slice(3, 10);
    const removed = applied(start, { kind: 'replace', from: 3, to: 10, slice: flatSlice() });

    expect([slice.openStart, slice.openEnd]).toEqual([1, 1]);
    expect(removed.textBetween(0, removed.size)).toBe('Herld\nab');
    expect(applied(removed, { kind: 'replace', from: 3, to: 3, slice }).root).toEqual(start.root);

    expect(
      applied(start, { kind: 'replace', from: 3, to: 17, slice: start.slice(3, 17) }).root,
    ).toEqual(start.root);
  });

  it('refuses slices that do not fit the depth, the content or the ids', () => {
    const start = page();
    const first = start.root.content[0];

    expect(
      applyStep(start, {
        kind: 'replace',
        from: 3,
        to: 3,
        slice: { content: [node('paragraph')], openStart: 2, openEnd: 0 },
      }),
    ).toEqual({ ok: false, reason: 'depth' });

    expect(
      applyStep(start, { kind: 'replace', from: 0, to: 0, slice: flatSlice(text('loose')) }),
    ).toEqual({ ok: false, reason: 'content' });

    expect(
      applyStep(start, { kind: 'replace', from: 3, to: 3, slice: flatSlice(node('paragraph')) }),
    ).toEqual({ ok: false, reason: 'content' });

    expect(
      applyStep(start, {
        kind: 'replace',
        from: 14,
        to: 14,
        slice: flatSlice(first?.kind === 'element' ? first : node('paragraph')),
      }),
    ).toEqual({ ok: false, reason: 'id' });

    expect(applyStep(start, { kind: 'replace', from: 5, to: 99, slice: flatSlice() })).toEqual({
      ok: false,
      reason: 'range',
    });

    expect(
      applyStep(start, {
        kind: 'replace',
        from: 6,
        to: 6,
        slice: flatSlice(text('x', [notes.mark('bold')])),
      }).ok,
    ).toBe(true);
  });
});

describe('replace around steps', () => {
  it('wraps a paragraph into a list and lifts it back with the inverse', () => {
    const start = page();
    const list = node('list', [node('item')]);

    const wrap: Step = {
      kind: 'replaceAround',
      from: 0,
      to: 7,
      gapFrom: 0,
      gapTo: 7,
      slice: flatSlice(list),
      insert: 2,
    };

    const wrapped = applied(start, wrap);
    const first = wrapped.root.content[0];

    expect(first?.kind === 'element' ? [first.type, first.id, first.size] : []).toEqual([
      'list',
      list.id,
      11,
    ]);

    expect(wrapped.textBetween(0, wrapped.size)).toBe('Hello\nWorld\nab');
    expect(applied(wrapped, invertStep(wrap, start)).root).toEqual(start.root);
    expect(stepMapOf(wrap).map(1)).toBe(3);
    expect(applyStep(start, { ...wrap, gapTo: 9 })).toEqual({ ok: false, reason: 'range' });
  });
});

describe('mark and attribute steps', () => {
  it('adds and removes marks only where the parent allows them', () => {
    const start = createDoc(notes, doc(node('paragraph', ['Hello']), node('code', ['let a'])));
    const bold = notes.mark('bold');
    const marked = applied(start, { kind: 'addMark', from: 2, to: 4, mark: bold });
    const paragraph = marked.root.content[0];
    const code = marked.root.content[1];

    expect(
      paragraph?.kind === 'element'
        ? paragraph.content.map((child) =>
            child.kind === 'text' ? [child.text, child.marks.length] : [],
          )
        : [],
    ).toEqual([
      ['H', 0],
      ['el', 1],
      ['lo', 0],
    ]);

    expect(
      applied(start, { kind: 'addMark', from: 0, to: start.size, mark: bold }).root.content[1],
    ).toBe(start.root.content[1]);

    expect(code).toBe(start.root.content[1]);

    expect(roundTrip(start, { kind: 'addMark', from: 2, to: 4, mark: bold }).root).toEqual(
      start.root,
    );

    expect(
      applied(marked, { kind: 'removeMark', from: 0, to: marked.size, mark: bold }).root,
    ).toEqual(start.root);

    expect(applyStep(start, { kind: 'addMark', from: 4, to: 4, mark: bold })).toEqual({
      ok: false,
      reason: 'range',
    });

    expect(
      applyStep(start, { kind: 'addMark', from: 1, to: 4, mark: { type: 'shadow', attrs: {} } }),
    ).toEqual({ ok: false, reason: 'range' });
  });

  it('sets the attributes of an element and of the document root', () => {
    const start = createDoc(notes, doc(node('heading', ['Title']), node('paragraph', ['x'])));
    const leveled = applied(start, { kind: 'attrs', pos: 0, attrs: { level: 2 } });

    expect(
      leveled.root.content[0]?.kind === 'element' ? leveled.root.content[0].attrs : {},
    ).toEqual({ level: 2 });

    expect(roundTrip(start, { kind: 'attrs', pos: 0, attrs: { level: 2 } }).root).toEqual(
      start.root,
    );

    expect(applyStep(start, { kind: 'attrs', pos: 0, attrs: { level: 9 } })).toEqual({
      ok: false,
      reason: 'attrs',
    });

    expect(applyStep(start, { kind: 'attrs', pos: 2, attrs: {} })).toEqual({
      ok: false,
      reason: 'target',
    });

    expect(applyStep(start, { kind: 'attrs', pos: 99, attrs: {} })).toEqual({
      ok: false,
      reason: 'range',
    });

    expect(applied(start, { kind: 'docAttrs', attrs: {} }).root).toEqual(start.root);

    expect(applyStep(start, { kind: 'docAttrs', attrs: { lang: 'ru' } })).toEqual({
      ok: false,
      reason: 'attrs',
    });

    expect(invertStep({ kind: 'docAttrs', attrs: {} }, start)).toEqual({
      kind: 'docAttrs',
      attrs: {},
    });
  });
});

describe('mapping and merging steps', () => {
  it('moves steps over earlier changes and drops the ones whose range vanished', () => {
    const earlier = stepMapOf(insert(1));

    expect(mapStep({ kind: 'replace', from: 3, to: 5, slice: flatSlice() }, earlier)).toMatchObject(
      { from: 5, to: 7 },
    );

    expect(
      mapStep({ kind: 'addMark', from: 2, to: 4, mark: notes.mark('bold') }, earlier),
    ).toMatchObject({ from: 4, to: 6 });

    expect(mapStep({ kind: 'attrs', pos: 0, attrs: {} }, earlier)).toMatchObject({ pos: 0 });

    expect(mapStep({ kind: 'docAttrs', attrs: {} }, earlier)).toEqual({
      kind: 'docAttrs',
      attrs: {},
    });

    const removal = stepMapOf({ kind: 'replace', from: 2, to: 10, slice: flatSlice() });

    expect(
      mapStep({ kind: 'replace', from: 4, to: 6, slice: flatSlice() }, removal),
    ).toBeUndefined();

    expect(
      mapStep({ kind: 'addMark', from: 4, to: 6, mark: notes.mark('bold') }, removal),
    ).toBeUndefined();

    expect(mapStep({ kind: 'attrs', pos: 4, attrs: {} }, removal)).toBeUndefined();

    expect(
      mapStep(
        {
          kind: 'replaceAround',
          from: 4,
          to: 8,
          gapFrom: 5,
          gapTo: 6,
          slice: flatSlice(),
          insert: 0,
        },
        removal,
      ),
    ).toBeUndefined();

    expect(
      mapStep(
        {
          kind: 'replaceAround',
          from: 0,
          to: 12,
          gapFrom: 4,
          gapTo: 6,
          slice: flatSlice(),
          insert: 0,
        },
        removal,
      ),
    ).toMatchObject({ from: 0, to: 4, gapFrom: 2, gapTo: 2 });

    expect(
      mapStep(
        {
          kind: 'replaceAround',
          from: 0,
          to: 14,
          gapFrom: 1,
          gapTo: 13,
          slice: flatSlice(),
          insert: 0,
        },
        earlier,
      ),
    ).toMatchObject({ from: 0, to: 16, gapFrom: 1, gapTo: 15 });
  });

  it('merges typing, backspace and forward delete runs and adjacent marks', () => {
    const typed = mergeSteps(insert(3), insert(5));

    expect(
      typed?.kind === 'replace' ? [typed.from, typed.to, typed.slice.content.length] : [],
    ).toEqual([3, 3, 1]);

    expect(
      mergeSteps(
        { kind: 'replace', from: 5, to: 6, slice: flatSlice() },
        { kind: 'replace', from: 4, to: 5, slice: flatSlice() },
      ),
    ).toMatchObject({ from: 4, to: 6 });

    expect(
      mergeSteps(
        { kind: 'replace', from: 5, to: 6, slice: flatSlice() },
        { kind: 'replace', from: 5, to: 6, slice: flatSlice() },
      ),
    ).toMatchObject({ from: 5, to: 7 });

    expect(mergeSteps(insert(3), insert(9))).toBeUndefined();

    expect(
      mergeSteps(insert(3), {
        kind: 'replace',
        from: 3,
        to: 3,
        slice: { content: [node('paragraph'), node('paragraph')], openStart: 1, openEnd: 1 },
      }),
    ).toBeUndefined();

    const bold = notes.mark('bold');

    expect(
      mergeSteps(
        { kind: 'addMark', from: 1, to: 3, mark: bold },
        { kind: 'addMark', from: 3, to: 6, mark: bold },
      ),
    ).toMatchObject({ from: 1, to: 6 });

    expect(
      mergeSteps(
        { kind: 'addMark', from: 1, to: 3, mark: bold },
        { kind: 'removeMark', from: 3, to: 6, mark: bold },
      ),
    ).toBeUndefined();
  });
});
