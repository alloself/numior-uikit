import { describe, expect, it } from 'vitest';
import { createDoc, type ContentNode } from '../src';
import { buildWith, notes } from './support/notes';

const { doc, node } = buildWith();

const list = node('list', [node('item', [node('paragraph', ['ab'])])]);
const image = node('image', [], { src: 'a.png' });
const page = createDoc(notes, doc(node('paragraph', ['Hello']), list, image));

const describeNode = (child: ContentNode | undefined): string | undefined => {
  if (child === undefined) {
    return undefined;
  }
  return child.kind === 'text' ? `"${child.text}"` : child.type;
};

const spot = (pos: number) => {
  const resolved = page.resolve(pos);

  return [
    resolved.depth,
    resolved.parent.type,
    resolved.index,
    resolved.textOffset,
    describeNode(resolved.nodeBefore),
    describeNode(resolved.nodeAfter),
  ];
};

describe('document positions', () => {
  it('counts text characters, element boundaries and leaves', () => {
    expect(page.size).toBe(16);
    expect(spot(0)).toEqual([0, 'doc', 0, 0, undefined, 'paragraph']);
    expect(spot(1)).toEqual([1, 'paragraph', 0, 0, undefined, '"Hello"']);
    expect(spot(3)).toEqual([1, 'paragraph', 0, 2, '"He"', '"llo"']);
    expect(spot(6)).toEqual([1, 'paragraph', 1, 0, '"Hello"', undefined]);
    expect(spot(7)).toEqual([0, 'doc', 1, 0, 'paragraph', 'list']);
    expect(spot(8)).toEqual([1, 'list', 0, 0, undefined, 'item']);
    expect(spot(9)).toEqual([2, 'item', 0, 0, undefined, 'paragraph']);
    expect(spot(11)).toEqual([3, 'paragraph', 0, 1, '"a"', '"b"']);
    expect(spot(13)).toEqual([2, 'item', 1, 0, 'paragraph', undefined]);
    expect(spot(15)).toEqual([0, 'doc', 2, 0, 'list', 'image']);
    expect(spot(16)).toEqual([0, 'doc', 3, 0, 'image', undefined]);
  });

  it('gives the bounds of every ancestor of a resolved position', () => {
    const resolved = page.resolve(11);

    expect(resolved.parentOffset).toBe(1);

    expect([1, 2, 3].map((depth) => resolved.node(depth).type)).toEqual([
      'list',
      'item',
      'paragraph',
    ]);

    expect([resolved.start(1), resolved.end(1), resolved.before(1), resolved.after(1)]).toEqual([
      8, 14, 7, 15,
    ]);

    expect([resolved.start(3), resolved.end(3), resolved.before(3), resolved.after(3)]).toEqual([
      10, 12, 9, 13,
    ]);

    expect([resolved.start(0), resolved.end(0)]).toEqual([0, 16]);
    expect(() => resolved.node(4)).toThrow(RangeError);
    expect(() => page.resolve(-1)).toThrow(RangeError);
    expect(() => page.resolve(17)).toThrow(/outside the document of size 16/);
    expect(() => page.resolve(1.5)).toThrow(RangeError);
  });

  it('finds nodes by id and by position', () => {
    const nested = list.content[0]?.kind === 'element' ? list.content[0].content[0] : undefined;

    expect(page.byId(list.id)).toBe(list);
    expect(page.positionOf(list.id)).toBe(7);
    expect(page.positionOf(image.id)).toBe(15);
    expect(nested?.kind === 'element' ? page.positionOf(nested.id) : undefined).toBe(9);
    expect(page.byId(page.root.id)).toBe(page.root);
    expect(page.positionOf(page.root.id)).toBeUndefined();
    expect(page.byId('missing')).toBeUndefined();
    expect(page.nodeAt(15)).toBe(image);
    expect(describeNode(page.nodeAt(2))).toBe('"ello"');
  });

  it('walks the nodes of a range in document order and skips children on request', () => {
    const visited: string[] = [];

    page.nodesBetween(0, 16, (child, pos) => {
      visited.push(`${describeNode(child)}@${pos}`);
      return child.kind !== 'element' || child.type !== 'list';
    });

    expect(visited).toEqual(['paragraph@0', '"Hello"@1', 'list@7', 'image@15']);

    const inner: string[] = [];

    page.nodesBetween(10, 12, (child, pos) => {
      inner.push(`${describeNode(child)}@${pos}`);
      return true;
    });

    expect(inner).toEqual(['list@7', 'item@8', 'paragraph@9', '"ab"@10']);
  });

  it('reads the text of a range with a separator between blocks', () => {
    expect(page.textBetween(0, 16)).toBe('Hello\nab');
    expect(page.textBetween(3, 11, ' / ')).toBe('llo / a');
    expect(page.textBetween(2, 4)).toBe('el');
  });

  it('cuts slices with open depths at both sides', () => {
    const slice = page.slice(3, 11);

    expect([slice.openStart, slice.openEnd]).toEqual([1, 3]);
    expect(slice.content.map(describeNode)).toEqual(['paragraph', 'list']);

    const cutList = slice.content[1];
    const cutItem = cutList?.kind === 'element' ? cutList.content[0] : undefined;

    expect(cutList?.kind === 'element' ? [cutList.id, cutList.size] : []).toEqual([list.id, 7]);
    expect(cutItem?.kind === 'element' ? cutItem.size : 0).toBe(5);
    expect(page.slice(1, 6)).toMatchObject({ openStart: 0, openEnd: 0 });
    expect(page.slice(7, 15).content).toEqual([list]);
    expect(page.slice(5, 5).content).toEqual([]);
    expect(() => page.slice(5, 3)).toThrow(/cannot run backwards/);
  });

  it('accepts only a root of the top type', () => {
    expect(() => createDoc(notes, node('paragraph'))).toThrow(/needs a "doc" root/);
  });
});
