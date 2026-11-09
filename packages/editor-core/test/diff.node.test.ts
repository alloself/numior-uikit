import { describe, expect, it } from 'vite-plus/test';
import { createState, diffDocs, replaceDocument, toHTML, undo, history, type Doc } from '../src';
import { fixtureSchema } from '../src/fixtures';
import { createDoc } from '../src/doc/doc';

type Block = readonly [id: string, text: string];

const paragraph = ([id, text]: Block) =>
  fixtureSchema.element('paragraph', {
    id,
    content: text === '' ? [] : [fixtureSchema.text(text)],
  });

const docOf = (...blocks: readonly Block[]): Doc =>
  createDoc(
    fixtureSchema,
    fixtureSchema.element(fixtureSchema.top.name, { id: 'root', content: blocks.map(paragraph) }),
  );

const divided = (...blocks: readonly Block[]): Doc =>
  createDoc(
    fixtureSchema,
    fixtureSchema.element(fixtureSchema.top.name, {
      id: 'root',
      content: [...blocks.map(paragraph), fixtureSchema.element('divider', { id: 'line' })],
    }),
  );

const htmlOfDiff = (before: Doc, after: Doc): string => toHTML(diffDocs(before, after).doc);

const stripped = (html: string): string =>
  html.replaceAll(/ class="[^"]*"/gu, '').replaceAll(/ data-[a-z-]+="[^"]*"/gu, '');

const words = (seed: string): string =>
  Array.from({ length: 1500 }, (_, index) => `${seed}${index.toString()}`).join(' ');

describe('diffDocs', () => {
  it('reports nothing between equal documents', () => {
    const diff = diffDocs(docOf(['a', 'same text']), docOf(['a', 'same text']));

    expect(diff.changes).toBe(0);
    expect(stripped(toHTML(diff.doc))).not.toMatch(/<ins|<del/u);
  });

  it('marks an added word', () => {
    const html = stripped(htmlOfDiff(docOf(['a', 'one two']), docOf(['a', 'one new two'])));

    expect(html).toContain('<ins>new');
    expect(html).not.toContain('<del');
  });

  it('marks a removed word in its place', () => {
    const html = stripped(htmlOfDiff(docOf(['a', 'one old two']), docOf(['a', 'one two'])));

    expect(html).toMatch(/one <del>old ?<\/del>/u);
  });

  it('shows a replaced word as removal and addition', () => {
    const html = stripped(htmlOfDiff(docOf(['a', 'one red']), docOf(['a', 'one blue'])));

    expect(html).toContain('<del>red</del>');
    expect(html).toContain('<ins>blue</ins>');
  });

  it('marks a whole added block', () => {
    const html = stripped(htmlOfDiff(docOf(['a', 'one']), docOf(['a', 'one'], ['b', 'new block'])));

    expect(html).toContain('<ins>new block</ins>');
  });

  it('keeps a removed block after its surviving neighbour', () => {
    const html = stripped(
      htmlOfDiff(
        docOf(['a', 'one'], ['b', 'gone'], ['c', 'two']),
        docOf(['a', 'one'], ['c', 'two']),
      ),
    );

    expect(html.indexOf('one')).toBeLessThan(html.indexOf('<del>gone'));
    expect(html.indexOf('<del>gone')).toBeLessThan(html.indexOf('two'));
  });

  it('keeps a block removed from the start before the first survivor', () => {
    const html = stripped(htmlOfDiff(docOf(['x', 'gone'], ['a', 'one']), docOf(['a', 'one'])));

    expect(html.indexOf('<del>gone')).toBeLessThan(html.indexOf('one'));
  });

  it('counts a removed block without text and leaves it out', () => {
    const diff = diffDocs(divided(['a', 'one']), docOf(['a', 'one']));

    expect(diff.changes).toBe(1);
    expect(toHTML(diff.doc)).not.toContain('<hr');
  });

  it('does not mark blocks that only moved', () => {
    const diff = diffDocs(docOf(['a', 'one'], ['b', 'two']), docOf(['b', 'two'], ['a', 'one']));

    expect(diff.changes).toBe(0);
  });

  it('replaces very long blocks wholesale instead of aligning them', () => {
    const diff = diffDocs(docOf(['a', words('x')]), docOf(['a', words('y')]));

    expect(toHTML(diff.doc)).toContain('<del');
    expect(toHTML(diff.doc)).toContain('<ins');
  });
});

describe('replaceDocument', () => {
  it('replaces the document in one step that undo reverts', () => {
    const state = createState({ doc: docOf(['a', 'current']), plugins: [history()] });
    let next = state;

    replaceDocument(docOf(['a', 'older'], ['b', 'text']))(state, (tr) => {
      next = state.apply(tr);
    });

    expect(next.doc.textBetween(0, next.doc.size, '|')).toBe('older|text');

    undo(next, (tr) => {
      next = next.apply(tr);
    });

    expect(next.doc.textBetween(0, next.doc.size, '|')).toBe('current');
  });
});
