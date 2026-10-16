import { describe, expect, it } from 'vite-plus/test';
import type { ContentNode, DocIssue, ElementNode } from '../src';
import { buildWith, notes } from './support/notes';

const { doc, node, text } = buildWith();

const issuesOf = (root: ElementNode): readonly DocIssue[] => {
  const result = notes.check(root);

  return result.ok ? [] : result.issues;
};

const withChildren = (parent: ElementNode, content: readonly ContentNode[]): ElementNode => ({
  ...parent,
  content,
});

describe('document check', () => {
  it('accepts a document built by the schema', () => {
    const root = doc(
      node('heading', ['Title'], { level: 2 }),
      node('paragraph', [
        'Plain ',
        text('bold', [notes.mark('bold')]),
        node('emoji', [], { name: 'wave' }),
      ]),
      node('list', [
        node('item', [node('paragraph', ['One']), node('image', [], { src: 'a.png' })]),
      ]),
      node('code', ['const a = 1;']),
    );

    expect(notes.check(root)).toEqual({ ok: true });
  });

  it('reports the root, content and unknown types', () => {
    expect(issuesOf(node('paragraph'))).toEqual([{ kind: 'type', path: [], type: 'paragraph' }]);

    expect(issuesOf(withChildren(doc(node('paragraph')), []))).toContainEqual({
      kind: 'content',
      path: [],
      type: 'doc',
    });

    const list = node('list', [node('item', [node('paragraph')])]);
    const figure: ElementNode = { ...node('paragraph'), type: 'figure' };

    expect(issuesOf(doc(withChildren(list, [node('paragraph')])))).toContainEqual({
      kind: 'content',
      path: [0],
      type: 'list',
    });

    expect(issuesOf(doc(node('paragraph'), figure))).toEqual([
      { kind: 'content', path: [], type: 'doc' },
      { kind: 'type', path: [1], type: 'figure' },
    ]);
  });

  it('reports marks a node does not allow and attributes that do not fit', () => {
    const marked = text('x', [notes.mark('bold')]);
    const heading = node('heading', ['Title']);
    const link: ContentNode = { kind: 'text', text: 'y', marks: [{ type: 'link', attrs: {} }] };

    expect(issuesOf(doc(withChildren(node('code', ['x']), [marked])))).toEqual([
      { kind: 'mark', path: [0, 0], mark: 'bold' },
    ]);

    expect(issuesOf(doc(node('paragraph', [link])))).toEqual([
      { kind: 'attr', path: [0, 0], attr: 'href', reason: 'missing' },
    ]);

    expect(issuesOf(doc({ ...heading, attrs: { level: 9 } }))).toEqual([
      { kind: 'attr', path: [0], attr: 'level', reason: 'invalid' },
    ]);

    expect(issuesOf(doc({ ...heading, attrs: { level: 1, size: 3 } }))).toEqual([
      { kind: 'attr', path: [0], attr: 'size', reason: 'unknown' },
    ]);
  });

  it('reports empty and repeated ids, unmerged or empty text and wrong sizes', () => {
    const first = node('paragraph', ['a']);
    const plain = text('a');

    expect(issuesOf(doc(first, { ...node('paragraph'), id: first.id }))).toEqual([
      { kind: 'id', path: [1], id: first.id, reason: 'duplicate' },
    ]);

    expect(issuesOf(doc({ ...first, id: '' }))).toEqual([
      { kind: 'id', path: [0], id: '', reason: 'empty' },
    ]);

    expect(issuesOf(doc(withChildren(node('paragraph'), [plain, plain])))).toEqual([
      { kind: 'size', path: [0] },
      { kind: 'text', path: [0, 1], reason: 'unmerged' },
    ]);

    expect(issuesOf(doc({ ...node('paragraph'), content: [text('')] }))).toEqual([
      { kind: 'text', path: [0, 0], reason: 'empty' },
    ]);

    expect(issuesOf(doc({ ...first, size: 9 }))).toEqual([{ kind: 'size', path: [0] }]);
  });
});
