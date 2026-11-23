import { createDoc, type Doc, type ElementNode } from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { YjsRoomDriver } from './yjs-driver';

const paragraph = (id: string, text: string): ElementNode =>
  fixtureSchema.element('paragraph', { id, content: [fixtureSchema.text(text)] });

const docOf = (...blocks: readonly ElementNode[]): Doc =>
  createDoc(
    fixtureSchema,
    fixtureSchema.element(fixtureSchema.top.name, { id: 'root', content: blocks }),
  );

const tenParagraphs = (): Doc =>
  docOf(
    ...Array.from({ length: 10 }, (_unused, index) =>
      paragraph(`p${String(index)}`, `Paragraph ${String(index)}`),
    ),
  );

let room: YjsRoomDriver | undefined;

const opened = async (doc: Doc): Promise<YjsRoomDriver> => {
  room = await YjsRoomDriver.open(doc);
  return room;
};

afterEach(() => {
  room?.close();
  room = undefined;
});

describe('two NuiEditors bound to Yjs', () => {
  it('carries what one person types and the line they start with Enter to the other', async () => {
    const shared: YjsRoomDriver = await opened(docOf(paragraph('a', 'one'), paragraph('b', 'two')));
    const { left, right } = shared;

    await left.placeAtEnd('a');
    await left.type(' more');
    await left.enter();
    await left.type('three');
    await shared.exchange();

    expect(right.texts).toEqual(['one more', 'three', 'two']);
    expect(right.shownText).toBe(left.shownText);
    expect(right.document).toEqual(left.document);
  });

  it('keeps both lines two people start with Enter at the same moment', async () => {
    const shared: YjsRoomDriver = await opened(docOf(paragraph('a', 'one'), paragraph('b', 'two')));
    const { left, right } = shared;

    await left.placeAtEnd('a');
    await left.enter();
    await left.type('LEFT');
    await right.placeAtEnd('b');
    await right.enter();
    await right.type('RIGHT');
    await shared.exchange();

    expect(left.texts).toEqual(['one', 'LEFT', 'two', 'RIGHT']);
    expect(right.document).toEqual(left.document);
    expect(new Set(left.blockIds).size).toBe(4);
  });

  it('undoes an own edit that sits between two edits someone made offline', async () => {
    const shared: YjsRoomDriver = await opened(tenParagraphs());
    const { left, right } = shared;

    await left.placeAtStart('p4');
    await left.type('mine ');
    await shared.send(left, right);
    await right.placeAtStart('p1');
    await right.type('X');
    await right.placeAtStart('p8');
    await right.type('Y');
    await shared.send(right, left);

    await left.undo();
    await shared.exchange();

    expect(left.texts.slice(0, 9)).toEqual([
      'Paragraph 0',
      'XParagraph 1',
      'Paragraph 2',
      'Paragraph 3',
      'Paragraph 4',
      'Paragraph 5',
      'Paragraph 6',
      'Paragraph 7',
      'YParagraph 8',
    ]);

    expect(right.document).toEqual(left.document);
  });
});
