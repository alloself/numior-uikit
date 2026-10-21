import { describe, expect, it } from 'vite-plus/test';
import {
  createDoc,
  createIdSource,
  createState,
  createTransform,
  invertStep,
  type Doc,
} from '../src';
import { buildWith, notes } from './support/notes';

const { doc, node, text } = buildWith();

const start = (): Doc =>
  createDoc(
    notes,
    doc(
      node('heading', ['Title']),
      node('paragraph', ['Hello ', text('bold', [notes.mark('bold')]), ' end']),
      node('list', [node('item', [node('paragraph', ['ab'])])]),
    ),
  );

const runs = (target: Doc, index: number): Array<[string, string[]]> => {
  const block = target.root.content[index];

  return block?.kind === 'element'
    ? block.content.flatMap((child): Array<[string, string[]]> =>
        child.kind === 'text'
          ? [[child.text, child.marks.map((mark) => `${mark.type}${mark.attrs['href'] ?? ''}`)]]
          : [],
      )
    : [];
};

const undo = (transform: ReturnType<typeof createTransform>): Doc =>
  transform.steps.reduceRight((current, step, index) => {
    const before = transform.docs[index];
    const inverse = before === undefined ? undefined : invertStep(step, before);
    const result = inverse === undefined ? undefined : createTransform(current).maybeStep(inverse);

    return result?.ok === true ? result.doc : current;
  }, transform.doc);

describe('transforms', () => {
  it('types text with the marks of the text before it and records every step', () => {
    const before = start();
    const transform = createTransform(before).insertText('er', 18).insertText('!', 24);

    expect(runs(transform.doc, 1)).toEqual([
      ['Hello ', []],
      ['bolder', ['bold']],
      [' end!', []],
    ]);

    expect(transform.steps).toHaveLength(2);
    expect(transform.docs[0]).toBe(before);
    expect(transform.before).toBe(before);
    expect(transform.changed).toBe(true);
    expect(transform.mapping.map(22)).toBe(25);

    expect(createTransform(before).insertText('x', 9, 9, []).doc.textBetween(0, 14)).toBe(
      'Title\nHxello',
    );

    expect(createTransform(before).insertText('', 8, 10).doc.textBetween(0, 11)).toBe('Title\nllo');
    expect(undo(transform).root).toEqual(before.root);
  });

  it('replaces a conflicting mark before adding a new one and removes marks by type or instance', () => {
    const before = createDoc(
      notes,
      doc(node('paragraph', [text('one', [notes.mark('link', { href: '/a' })]), ' two'])),
    );

    const linked = createTransform(before).addMark(2, 6, notes.mark('link', { href: '/b' }));

    expect(runs(linked.doc, 0)).toEqual([
      ['o', ['link/a']],
      ['ne t', ['link/b']],
      ['wo', []],
    ]);

    expect(linked.steps.map((step) => step.kind)).toEqual(['removeMark', 'addMark']);
    expect(undo(linked).root).toEqual(before.root);

    expect(runs(createTransform(linked.doc).removeMark(0, 9, 'link').doc, 0)).toEqual([
      ['one two', []],
    ]);

    expect(
      runs(createTransform(linked.doc).removeMark(0, 9, notes.mark('link', { href: '/a' })).doc, 0),
    ).toEqual([
      ['o', []],
      ['ne t', ['link/b']],
      ['wo', []],
    ]);

    expect(createTransform(before).addMark(1, 4, notes.mark('link', { href: '/a' })).steps).toEqual(
      [],
    );

    expect(createTransform(linked.doc).removeMark(0, 9).steps).toHaveLength(2);
  });

  it('marks a range with mixed marks in one step and takes back exactly what it changed', () => {
    const bold = notes.mark('bold');

    const before = createDoc(
      notes,
      doc(
        node('paragraph', ['a', text('b', [bold]), 'c']),
        node('paragraph', [text('d', [bold]), 'e']),
      ),
    );

    const added = createTransform(before).addMark(1, 9, bold);

    expect(added.steps).toHaveLength(1);
    expect(runs(added.doc, 0)).toEqual([['abc', ['bold']]]);
    expect(undo(added).root).toEqual(before.root);

    const removed = createTransform(before).removeMark(1, 9, bold);

    expect(removed.steps).toHaveLength(1);
    expect(runs(removed.doc, 1)).toEqual([['de', []]]);
    expect(undo(removed).root).toEqual(before.root);

    expect(invertStep(added.steps[0] ?? { kind: 'docAttrs', attrs: {} }, before)).toEqual({
      kind: 'removeMark',
      from: 1,
      to: 8,
      mark: bold,
      skip: [
        { from: 2, to: 3 },
        { from: 6, to: 7 },
      ],
    });
  });

  it('splits blocks with a fresh id and an optional new type and joins them back', () => {
    const before = start();

    const split = createTransform(before, { ids: createIdSource('s') }).split(10, 1, {
      type: 'heading',
      attrs: { level: 2 },
    });

    const created = split.doc.root.content[2];

    expect(split.doc.textBetween(0, split.doc.size)).toBe('Title\nHe\nllo bold end\nab');

    expect(created?.kind === 'element' ? [created.type, created.attrs, created.id] : []).toEqual([
      'heading',
      { level: 2 },
      's1',
    ]);

    expect(createTransform(split.doc).join(11).doc.textBetween(0, 40)).toBe(
      'Title\nHello bold end\nab',
    );

    const nested = createTransform(before).split(28, 2);

    expect(
      nested.doc.root.content[2]?.kind === 'element'
        ? nested.doc.root.content[2].content.length
        : 0,
    ).toBe(2);

    expect(undo(nested).root).toEqual(before.root);
  });

  it('inserts copies with fresh ids and sets attributes of nodes and the document', () => {
    const before = start();
    const heading = before.root.content[0];

    const copied = createTransform(before, { ids: createIdSource('c') }).insert(
      0,
      heading?.kind === 'element' ? [heading] : [],
    );

    const first = copied.doc.root.content[0];

    expect(first?.kind === 'element' ? first.id : '').toBe('c1');
    expect(notes.check(copied.doc.root)).toEqual({ ok: true });

    expect(createTransform(before).setNodeAttrs(0, { level: 2 }).doc.root.content[0]).toMatchObject(
      { attrs: { level: 2 } },
    );

    expect(createTransform(before).setDocAttrs({}).steps).toHaveLength(1);

    expect(() => createTransform(before).setNodeAttrs(2, { level: 2 })).toThrow(
      /No element starts at position 2/,
    );

    expect(() => createTransform(before).insert(0, [text('loose')])).toThrow(
      /replace step cannot apply: content/,
    );

    expect(
      createTransform(before).maybeStep({ kind: 'attrs', pos: 0, attrs: { level: 7 } }),
    ).toEqual({ ok: false, reason: 'attrs' });
  });

  it('numbers new ids after the highest id of the document and places each of them once', () => {
    const before = createDoc(
      notes,
      notes.element('doc', {
        id: 'n9',
        content: [
          notes.element('paragraph', { id: 'nz', content: [notes.text('a')] }),
          notes.element('paragraph', { id: 'other', content: [notes.text('b')] }),
        ],
      }),
    );

    const transform = createTransform(before);
    const id = transform.newId();
    const paragraph = notes.element('paragraph', { id, content: [notes.text('c')] });

    expect(id).toBe('n10');

    transform.maybeStep({
      kind: 'replace',
      from: 0,
      to: 0,
      slice: { content: [paragraph], openStart: 0, openEnd: 0 },
    });

    expect(
      transform.maybeStep({
        kind: 'replace',
        from: 0,
        to: 0,
        slice: { content: [paragraph], openStart: 0, openEnd: 0 },
      }),
    ).toEqual({ ok: false, reason: 'id' });
  });

  it('never hands out an id that an inserted node already brought into the document', () => {
    const before = createDoc(
      notes,
      notes.element('doc', {
        id: 'n1',
        content: [notes.element('paragraph', { id: 'n2', content: [notes.text('a')] })],
      }),
    );

    const state = createState({ doc: before });
    const foreign = notes.element('paragraph', { id: 'n7', content: [notes.text('b')] });
    const next = state.apply(state.tr.insert(0, [foreign]));

    expect(next.doc.byId('n7')).toBeDefined();
    expect(next.tr.newId()).toBe('n8');
  });
});
