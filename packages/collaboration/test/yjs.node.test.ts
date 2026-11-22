import {
  createDoc,
  createState,
  history,
  moveBlock,
  setBlockType,
  textSelection,
  undo,
  type Doc,
  type EditorState,
  type ElementNode,
  type Plugin,
  type Transaction,
} from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import * as fc from 'fast-check';
import { describe, expect, it, vi } from 'vite-plus/test';
import {
  applyUpdate,
  Doc as YDoc,
  encodeStateAsUpdate,
  encodeStateVector,
  Array as YArray,
  Map as YMap,
  XmlText,
} from 'yjs';
import { yjsBinding, type YjsBinding } from '../src/yjs';

interface Client {
  readonly ydoc: YDoc;
  readonly binding: YjsBinding;
  readonly state: () => EditorState;
  readonly apply: (build: (state: EditorState) => Transaction) => void;
  readonly insertAt: (id: string, text: string) => void;
  readonly undo: () => void;
  readonly text: () => string;
}

interface Turn {
  readonly who: number;
  readonly kind: 'type' | 'move' | 'nest';
  readonly block: string;
  readonly to: number;
  readonly peer: number;
  readonly exchanged: boolean;
}

const BLOCKS = 'document';

const LATENCY_BUDGET_MS = 100;

const MOVABLE = ['a', 'b', 'c', 'd'] as const;

const CARRIED = ['a', 'b', 'c', 'd', 'e', 'q', 'q2'] as const;

const paragraph = (id: string, text: string): ElementNode =>
  fixtureSchema.element('paragraph', {
    id,
    content: text === '' ? [] : [fixtureSchema.text(text)],
  });

const docOf = (...blocks: readonly ElementNode[]): Doc =>
  createDoc(
    fixtureSchema,
    fixtureSchema.element(fixtureSchema.top.name, { id: 'root', content: blocks }),
  );

const emit = (plugin: Plugin, next: EditorState, before: EditorState): void => {
  plugin.props.stateChanged?.(next, before);
};

const clientOf = (
  doc: Doc,
  onInvalid?: () => void,
  ydoc = new YDoc(),
  extra: readonly Plugin[] = [],
): Client => {
  let state: EditorState | undefined;

  const binding = yjsBinding(ydoc, BLOCKS, {
    schema: fixtureSchema,
    getState: () => state,
    dispatch: (tr) => {
      if (state === undefined) {
        return;
      }

      const before = state;

      state = state.apply(tr);
      emit(binding.plugin, state, before);
    },
    onInvalid,
  });

  state = createState({ doc, plugins: [binding.plugin, ...extra] });

  const current = (): EditorState => {
    if (state === undefined) {
      throw new Error('The client has no state');
    }
    return state;
  };

  const apply = (build: (from: EditorState) => Transaction): void => {
    const before = current();

    state = before.apply(build(before));
    emit(binding.plugin, state, before);
  };

  return {
    ydoc,
    binding,
    state: current,
    apply,
    insertAt: (id, text) => {
      apply((from) => from.tr.insertText(text, (from.doc.positionOf(id) ?? 0) + 1));
    },
    undo: () => {
      undo(current(), (tr) => {
        apply(() => tr);
      });
    },
    text: () =>
      current()
        .doc.root.content.map((block) => textOf(block))
        .join('|'),
  };
};

const textOf = (node: ElementNode['content'][number]): string =>
  node.kind === 'text' ? node.text : node.content.map(textOf).join('');

const send = (from: Client, to: Client): void => {
  applyUpdate(to.ydoc, encodeStateAsUpdate(from.ydoc, encodeStateVector(to.ydoc)));
};

const exchange = (left: Client, right: Client): void => {
  send(left, right);
  send(right, left);
};

const pair = (doc: Doc): readonly [Client, Client] => {
  const left = clientOf(doc);
  const right = clientOf(doc);

  left.binding.seed(doc);
  exchange(left, right);
  return [left, right];
};

const carry = (client: Client, id: string, before: string | undefined): void => {
  client.apply((from) => {
    const start = from.doc.positionOf(id) ?? 0;
    const target = before === undefined ? from.doc.size : (from.doc.positionOf(before) ?? 0);

    return from.tr.step({
      kind: 'move',
      from: start,
      to: start + (from.doc.byId(id)?.size ?? 0),
      target,
    });
  });
};

const numbered = (count: number): Doc =>
  docOf(
    ...Array.from({ length: count }, (_unused, index) =>
      paragraph(`p${String(index)}`, `Paragraph ${String(index)}`),
    ),
  );

const sharedBlocks = (client: Client): YMap<unknown> => client.ydoc.getMap(BLOCKS);

const sharedOrder = (client: Client): YArray<unknown> => client.ydoc.getArray(`${BLOCKS}:order`);

const childList = (client: Client, parent: string): YArray<unknown> | undefined => {
  if (parent === '') {
    return sharedOrder(client);
  }

  const entry = sharedBlocks(client).get(parent);
  const list = entry instanceof YMap ? entry.get('nui:children') : undefined;

  return list instanceof YArray ? list : undefined;
};

const typeField = (client: Client, id: string): unknown => {
  const entry = sharedBlocks(client).get(id);

  if (entry instanceof XmlText) {
    return entry.getAttribute('nui:type');
  }
  return entry instanceof YMap ? entry.get('nui:type') : undefined;
};

const blocksOf = (client: Client): readonly unknown[] => Array.from(sharedBlocks(client).values());

const addForeign = (client: Client, type: string): void => {
  client.ydoc.transact(() => {
    const entry = new YMap<unknown>();

    sharedBlocks(client).set('alien', entry);
    entry.set('nui:type', type);
    sharedOrder(client).push(['alien']);
  });
};

const sharedText = (client: Client, id: string): string => {
  const entry = sharedBlocks(client).get(id);
  const delta: unknown = entry instanceof XmlText ? entry.toDelta() : [];

  return Array.isArray(delta)
    ? delta.reduce<string>(
        (text, item: unknown) =>
          typeof item === 'object' &&
          item !== null &&
          'insert' in item &&
          typeof item.insert === 'string'
            ? text + item.insert
            : text,
        '',
      )
    : '';
};

const quote = (id: string, ...blocks: readonly ElementNode[]): ElementNode =>
  fixtureSchema.element('blockquote', { id, content: blocks });

const slotOf = (client: Client, id: string): { parent: string; index: number } => {
  const { root } = client.state().doc;
  const index = root.content.findIndex((node) => node.kind === 'element' && node.id === id);

  if (index >= 0) {
    return { parent: root.id, index };
  }

  const holder = root.content.find(
    (node) =>
      node.kind === 'element' &&
      node.content.some((child) => child.kind === 'element' && child.id === id),
  );

  return holder?.kind === 'element'
    ? {
        parent: holder.id,
        index: holder.content.findIndex((child) => child.kind === 'element' && child.id === id),
      }
    : { parent: root.id, index: -1 };
};

const takeOut = (list: YArray<unknown>, id: string): void => {
  const items = list.toArray();

  for (let at = items.length - 1; at >= 0; at -= 1) {
    if (items[at] !== id) {
      continue;
    }
    list.delete(at, 1);
  }
};

const tangle = (client: Client, parents: Readonly<Record<string, string>>): void => {
  client.ydoc.transact(() => {
    for (const [id, parent] of Object.entries(parents)) {
      for (const holder of ['', ...Object.keys(parents)]) {
        const list = childList(client, holder);

        if (list === undefined) {
          continue;
        }
        takeOut(list, id);
      }
      childList(client, parent)?.push([id]);
    }
  });
};

const listings = (client: Client): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();

  for (const holder of ['', ...sharedBlocks(client).keys()]) {
    for (const item of childList(client, holder)?.toArray() ?? []) {
      const id = String(item);

      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
};

const remove = (client: Client, id: string): void => {
  client.apply((from) => {
    const at = from.doc.positionOf(id) ?? 0;

    return from.tr.delete(at, at + (from.doc.byId(id)?.size ?? 0));
  });
};

const insertBefore = (client: Client, before: string, ids: readonly string[]): void => {
  client.apply((from) => {
    const at = from.doc.positionOf(before) ?? 0;

    return from.tr.replace(at, at, {
      content: ids.map((id) => paragraph(id, id)),
      openStart: 0,
      openEnd: 0,
    });
  });
};

const moveInto = (client: Client, id: string, parent: string, index: number): void => {
  moveBlock(slotOf(client, id), { parent, index })(client.state(), (tr) => {
    client.apply(() => tr);
  });
};

describe('yjsBinding', () => {
  it('reads a seeded document back', () => {
    const doc = docOf(paragraph('a', 'Hello'), paragraph('b', 'World'));
    const client = clientOf(doc);

    client.binding.seed(doc);

    expect(client.binding.read()?.root.content).toEqual(doc.root.content);
  });

  it('leaves the type of a plain line out of Yjs and writes it for any other block', () => {
    const [left, right] = pair(docOf(paragraph('a', 'Title'), quote('q', paragraph('b', 'Body'))));

    expect(typeField(left, 'a')).toBeUndefined();
    expect(typeField(left, 'b')).toBeUndefined();
    expect(typeField(left, 'q')).toBe('blockquote');

    left.apply((from) => from.tr.setSelection(textSelection(2)));

    setBlockType('heading', { level: 2 })(left.state(), (tr) => {
      left.apply(() => tr);
    });

    exchange(left, right);

    expect(typeField(left, 'a')).toBe('heading');
    expect(right.state().doc.root.content[0]).toMatchObject({ type: 'heading', id: 'a' });

    setBlockType('paragraph')(left.state(), (tr) => {
      left.apply(() => tr);
    });

    exchange(left, right);

    expect(typeField(left, 'a')).toBeUndefined();
    expect(right.state().doc.root).toEqual(left.state().doc.root);
    expect(right.state().doc.root.content[0]).toMatchObject({ type: 'paragraph', id: 'a' });
  });

  it('has nothing to read in an empty fragment', () => {
    expect(clientOf(docOf(paragraph('a', ''))).binding.read()).toBeUndefined();
  });

  it('carries typing to the other side', () => {
    const [left, right] = pair(docOf(paragraph('a', 'Hello')));

    left.insertAt('a', '>> ');
    exchange(left, right);

    expect(right.text()).toBe('>> Hello');
  });

  it('carries a character outside the basic plane typed or deleted next to another one', () => {
    const [left, right] = pair(docOf(paragraph('a', '\u{1F600}')));

    left.insertAt('a', '\u{1F601}');
    exchange(left, right);

    expect(right.text()).toBe('\u{1F601}\u{1F600}');

    left.apply((from) => from.tr.delete(1, 3));
    exchange(left, right);

    expect(left.text()).toBe('\u{1F600}');
    expect(right.text()).toBe('\u{1F600}');
  });

  it('merges typing from both sides', () => {
    const [left, right] = pair(docOf(paragraph('a', 'middle')));

    left.insertAt('a', 'L');
    right.apply((from) => from.tr.insertText('R', 7));
    exchange(left, right);

    expect(left.text()).toBe('LmiddleR');
    expect(right.text()).toBe('LmiddleR');
  });

  it('carries marks and their removal', () => {
    const [left, right] = pair(docOf(paragraph('a', 'Hello')));
    const bold = fixtureSchema.mark('bold');

    left.apply((from) => from.tr.addMark(1, 4, bold));
    exchange(left, right);

    expect(right.state().doc.root).toEqual(left.state().doc.root);

    left.apply((from) => from.tr.removeMark(1, 4, bold));
    exchange(left, right);

    expect(right.state().doc.root).toEqual(left.state().doc.root);
  });

  it('carries attribute changes without touching the text', () => {
    const heading = fixtureSchema.element('heading', {
      id: 'h',
      attrs: { level: 1 },
      content: [fixtureSchema.text('Title')],
    });

    const [left, right] = pair(docOf(heading));

    left.apply((from) => from.tr.setNodeAttrs(0, { level: 2 }));
    exchange(left, right);

    expect(right.state().doc.byId('h')?.attrs).toEqual({ level: 2 });
    expect(right.text()).toBe('Title');
  });

  it('carries a mention inside a line and the text typed around it', () => {
    const line = fixtureSchema.element('paragraph', {
      id: 'a',
      content: [
        fixtureSchema.text('Hi '),
        fixtureSchema.element('mention', { id: 'm', attrs: { user: 'u1', label: 'Ann' } }),
        fixtureSchema.text('!'),
      ],
    });

    const [left, right] = pair(docOf(line, paragraph('b', 'two')));

    left.insertAt('a', 'Oh, ');
    exchange(left, right);

    expect(right.state().doc.root).toEqual(left.state().doc.root);
    expect(right.state().doc.byId('m')?.attrs).toEqual({ user: 'u1', label: 'Ann' });
    expect(right.text()).toBe('Oh, Hi !|two');
  });

  it('carries a change of the attributes of a mention', () => {
    const line = fixtureSchema.element('paragraph', {
      id: 'a',
      content: [
        fixtureSchema.text('Hi '),
        fixtureSchema.element('mention', { id: 'm', attrs: { user: 'u1', label: 'Ann' } }),
      ],
    });

    const [left, right] = pair(docOf(line));

    left.apply((from) =>
      from.tr.setNodeAttrs(from.doc.positionOf('m') ?? 0, { user: 'u2', label: 'Bob' }),
    );

    exchange(left, right);

    expect(right.state().doc.byId('m')?.attrs).toEqual({ user: 'u2', label: 'Bob' });
    expect(right.binding.read()?.root.content).toEqual(left.state().doc.root.content);
  });

  it('keeps one of two mentions two people inserted with the same id at once', () => {
    const [left, right] = pair(docOf(paragraph('a', 'one'), paragraph('b', 'two')));

    const mention = fixtureSchema.element('mention', {
      id: 'm',
      attrs: { user: 'u1', label: 'Ann' },
    });

    for (const [client, block] of [
      [left, 'a'],
      [right, 'b'],
    ] as const) {
      client.apply((from) => {
        const at = (from.doc.positionOf(block) ?? 0) + 1;

        return from.tr.replace(at, at, { content: [mention], openStart: 0, openEnd: 0 });
      });
    }

    exchange(left, right);
    exchange(left, right);

    expect(left.state().doc.root).toEqual(right.state().doc.root);
    expect(fixtureSchema.check(left.state().doc.root).ok).toBe(true);
    expect(left.state().doc.byId('m')).toBeDefined();
    expect(right.binding.read()?.root.content).toEqual(right.state().doc.root.content);
  });

  it('carries new and deleted blocks', () => {
    const [left, right] = pair(docOf(paragraph('a', 'one'), paragraph('b', 'two')));

    left.apply((from) => from.tr.delete(from.doc.positionOf('b') ?? 0, from.doc.size));

    left.apply((from) =>
      from.tr.replace(from.doc.size, from.doc.size, {
        content: [paragraph('c', 'three')],
        openStart: 0,
        openEnd: 0,
      }),
    );

    exchange(left, right);

    expect(right.text()).toBe('one|three');
  });

  it('keeps text typed into the blocks a carried block passed on its way down or up', () => {
    const page = docOf(
      paragraph('a', 'one'),
      paragraph('b', 'two'),
      paragraph('c', 'three'),
      paragraph('d', 'four'),
    );

    const [down, typing] = pair(page);

    carry(down, 'a', 'd');
    typing.insertAt('b', 'X');
    exchange(down, typing);

    expect([down.text(), typing.text()]).toEqual(['Xtwo|three|one|four', 'Xtwo|three|one|four']);

    const [up, writing] = pair(page);

    carry(up, 'd', 'a');
    writing.insertAt('c', 'Y');
    exchange(up, writing);

    expect([up.text(), writing.text()]).toEqual(['four|one|two|Ythree', 'four|one|two|Ythree']);
  });

  it('keeps every block of the shared tree when a block is carried, the carried one included', () => {
    const [left] = pair(numbered(6));
    const before = blocksOf(left);

    carry(left, 'p1', 'p5');

    const after = blocksOf(left);

    expect(after.filter((block) => before.includes(block))).toHaveLength(6);

    expect(left.text()).toBe(
      'Paragraph 0|Paragraph 2|Paragraph 3|Paragraph 4|Paragraph 1|Paragraph 5',
    );
  });

  it('keeps one copy of a block two people carried to different places at once', () => {
    const [left, right] = pair(numbered(5));

    carry(left, 'p1', 'p4');
    carry(right, 'p1', 'p0');
    exchange(left, right);
    exchange(left, right);

    expect(left.text()).toBe(right.text());

    expect(
      left
        .text()
        .split('|')
        .filter((text) => text === 'Paragraph 1'),
    ).toHaveLength(1);

    expect(left.text().split('|')).toHaveLength(5);
    expect(Array.from(listings(left).values())).toEqual(Array(5).fill(1));
    expect(listings(right)).toEqual(listings(left));
  });

  it('lists a block once after two people carried it down to different places at once', () => {
    const [left, right] = pair(numbered(5));

    carry(left, 'p1', 'p4');
    carry(right, 'p1', undefined);
    exchange(left, right);
    exchange(left, right);

    expect([left.text(), right.text()]).toEqual([
      'Paragraph 0|Paragraph 2|Paragraph 3|Paragraph 1|Paragraph 4',
      'Paragraph 0|Paragraph 2|Paragraph 3|Paragraph 1|Paragraph 4',
    ]);

    expect(Array.from(listings(left).values())).toEqual(Array(5).fill(1));
    expect(listings(right)).toEqual(listings(left));
  });

  it('drops a block one person deleted while another carried it', () => {
    const [left, right] = pair(numbered(4));

    remove(left, 'p1');
    carry(right, 'p1', undefined);
    exchange(left, right);
    exchange(left, right);

    expect([left.text(), right.text()]).toEqual([
      'Paragraph 0|Paragraph 2|Paragraph 3',
      'Paragraph 0|Paragraph 2|Paragraph 3',
    ]);

    expect(listings(right)).toEqual(listings(left));
  });

  it('keeps a block carried into a quote someone deleted at the same time at the end of the document', () => {
    const [left, right] = pair(
      docOf(
        paragraph('a', 'one'),
        quote('q', paragraph('inner', 'quoted')),
        paragraph('c', 'three'),
      ),
    );

    moveInto(left, 'a', 'q', 1);
    remove(right, 'q');
    exchange(left, right);
    exchange(left, right);

    expect(left.state().doc.root).toEqual(right.state().doc.root);
    expect([left.text(), right.text()]).toEqual(['three|one', 'three|one']);
    expect(right.binding.read()?.root.content).toEqual(right.state().doc.root.content);
  });

  it('keeps text typed into a block while someone else carries it', () => {
    const [left, right] = pair(
      docOf(paragraph('a', 'one'), paragraph('b', 'two'), paragraph('c', 'three')),
    );

    carry(left, 'a', undefined);
    right.insertAt('a', 'X');
    exchange(left, right);

    expect([left.text(), right.text()]).toEqual(['two|three|Xone', 'two|three|Xone']);
  });

  it('keeps text typed into a block while someone else carries it into a quote', () => {
    const [left, right] = pair(
      docOf(
        paragraph('a', 'one'),
        quote('q', paragraph('inner', 'quoted')),
        paragraph('c', 'three'),
      ),
    );

    moveInto(left, 'a', 'q', 1);
    right.insertAt('a', 'X');
    exchange(left, right);

    expect(left.state().doc.root).toEqual(right.state().doc.root);
    expect(left.text()).toBe('quotedXone|three');
  });

  it('keeps text typed into a paragraph while someone else turns it into a heading', () => {
    const [left, right] = pair(docOf(paragraph('a', 'Title'), paragraph('b', 'Body')));

    left.apply((from) => from.tr.setSelection(textSelection(2)));

    setBlockType('heading', { level: 2 })(left.state(), (tr) => {
      left.apply(() => tr);
    });

    right.insertAt('a', 'New ');
    exchange(left, right);

    expect(left.state().doc.root).toEqual(right.state().doc.root);
    expect(left.state().doc.root.content[0]).toMatchObject({ type: 'heading', id: 'a' });
    expect(left.text()).toBe('New Title|Body');
  });

  it('keeps the blocks two people insert at the same place together', () => {
    const [left, right] = pair(docOf(paragraph('a', 'one'), paragraph('b', 'two')));

    insertBefore(left, 'b', ['L1', 'L2', 'L3']);
    insertBefore(right, 'b', ['R1', 'R2', 'R3']);
    exchange(left, right);

    expect(left.text()).toBe(right.text());
    expect(['one|L1|L2|L3|R1|R2|R3|two', 'one|R1|R2|R3|L1|L2|L3|two']).toContain(left.text());
  });

  it('keeps both quotes when two people carry each of them into the other at once', () => {
    const [left, right] = pair(
      docOf(quote('q1', paragraph('p1', 'one')), quote('q2', paragraph('p2', 'two'))),
    );

    moveInto(left, 'q1', 'q2', 1);
    moveInto(right, 'q2', 'q1', 1);
    exchange(left, right);
    exchange(left, right);

    expect(left.state().doc.root).toEqual(right.state().doc.root);
    expect(fixtureSchema.check(left.state().doc.root).ok).toBe(true);
    expect(left.text().split('|').join('')).toMatch(/^(onetwo|twoone)$/u);

    left.insertAt('p1', 'L');
    exchange(left, right);

    expect(right.text()).toBe(left.text());
    expect(right.binding.read()?.root.content).toEqual(right.state().doc.root.content);
  });

  it('keeps a block and everything in it when concurrent moves tie it into a loop twice', () => {
    const [left, right] = pair(
      docOf(
        quote('qa', paragraph('pa', 'one')),
        quote('qb', paragraph('pb', 'two')),
        quote('qc', paragraph('pc', 'three')),
      ),
    );

    tangle(left, { qa: 'qc', qb: 'qa', qc: 'qa' });

    exchange(left, right);

    expect(left.state().doc.root).toEqual(right.state().doc.root);
    expect(fixtureSchema.check(left.state().doc.root).ok).toBe(true);
    expect(left.text()).toBe('onetwothree');
  });

  it(
    'carries the first of ten thousand blocks to the end within the latency budget',
    { tags: ['budget'] },
    () => {
      const [left] = pair(numbered(10_000));
      const started = performance.now();

      carry(left, 'p0', undefined);

      expect(performance.now() - started).toBeLessThan(LATENCY_BUDGET_MS);
      expect(left.text().endsWith('Paragraph 9999|Paragraph 0')).toBe(true);
    },
  );

  it(
    'opens a document of ten thousand blocks that arrives after the binding within the latency budget',
    { tags: ['budget'] },
    () => {
      const doc = numbered(10_000);
      const author = clientOf(doc);
      const readers = [0, 1, 2].map(() => clientOf(docOf(paragraph('empty', ''))));

      author.binding.seed(doc);

      const times = readers.map((reader) => {
        const started = performance.now();

        send(author, reader);
        return performance.now() - started;
      });

      expect(Math.min(...times)).toBeLessThan(LATENCY_BUDGET_MS);
      expect(readers.map((reader) => reader.text())).toEqual(readers.map(() => author.text()));
    },
  );

  it(
    'carries typing in a document of ten thousand blocks to the other side within the latency budget',
    { tags: ['budget'] },
    () => {
      const [left, right] = pair(numbered(10_000));
      const started = performance.now();

      left.insertAt('p5000', 'X');
      send(left, right);

      expect(performance.now() - started).toBeLessThan(LATENCY_BUDGET_MS);
      expect(right.text()).toBe(left.text());
    },
  );

  it('keeps the caret of the receiver in place across a remote insert', () => {
    const [left, right] = pair(docOf(paragraph('a', 'Hello')));

    right.apply((from) => from.tr.setSelection(textSelection(4)));
    left.insertAt('a', 'XY');
    exchange(left, right);

    expect(right.state().selection).toMatchObject({ anchor: 6, head: 6 });
  });

  it('undoes only its own typing after a remote change', () => {
    const doc = docOf(paragraph('a', 'Hello'));
    const left = clientOf(doc, undefined, new YDoc(), [history()]);
    const right = clientOf(doc);

    left.binding.seed(doc);
    exchange(left, right);
    left.insertAt('a', 'L');
    right.apply((from) => from.tr.insertText('R', 6));
    exchange(left, right);

    left.undo();
    exchange(left, right);

    expect(left.text()).toBe('HelloR');
    expect(right.text()).toBe('HelloR');
  });

  it('removes a list left empty by two concurrent deletions', () => {
    const list = fixtureSchema.element('bullet_list', {
      id: 'list',
      content: ['one', 'two'].map((text, index) =>
        fixtureSchema.element('list_item', {
          id: `item${String(index)}`,
          content: [paragraph(`p${String(index)}`, text)],
        }),
      ),
    });

    const [left, right] = pair(docOf(paragraph('a', 'keep'), list));

    remove(left, 'item0');
    remove(right, 'item1');
    exchange(left, right);

    expect(fixtureSchema.check(left.state().doc.root).ok).toBe(true);
    expect(left.text()).toBe('keep');
    expect(right.text()).toBe('keep');
  });

  it('reports a tree from an unknown schema and leaves it alone', () => {
    const onInvalid = vi.fn<() => void>();
    const doc = docOf(paragraph('a', 'Hello'));
    const client = clientOf(doc, onInvalid);

    client.binding.seed(doc);
    addForeign(client, 'hologram');

    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(sharedBlocks(client).size).toBe(2);
    expect(client.text()).toBe('Hello');
  });

  it('writes nothing over a tree it could not read and goes on once it reads again', () => {
    const doc = docOf(paragraph('a', 'Hello'));
    const client = clientOf(doc);

    client.binding.seed(doc);
    addForeign(client, 'hologram');
    client.insertAt('a', '!');

    expect(sharedText(client, 'a')).toBe('Hello');

    client.ydoc.transact(() => {
      sharedBlocks(client).delete('alien');
    });

    client.insertAt('a', '?');

    expect(client.text()).toBe('?Hello');
    expect(client.binding.read()?.root.content).toEqual(client.state().doc.root.content);
  });

  it('stops listening once destroyed', () => {
    const [left, right] = pair(docOf(paragraph('a', 'Hello')));

    right.binding.destroy();
    left.insertAt('a', 'X');
    exchange(left, right);

    expect(right.text()).toBe('Hello');
  });
});

const applyEdit = (client: Client, block: string, kind: string, text: string): void => {
  const { doc } = client.state();
  const at = (doc.positionOf(block) ?? 0) + 1;
  const length = doc.byId(block)?.size === undefined ? 0 : (doc.byId(block)?.size ?? 2) - 2;

  if (kind === 'type' || length === 0) {
    client.insertAt(block, text);
  } else if (kind === 'bold') {
    client.apply((from) => from.tr.addMark(at, at + length, fixtureSchema.mark('bold')));
  } else {
    client.apply((from) => from.tr.delete(at, at + 1));
  }
};

const lettersIn = (text: string, letter: string): number => text.split(letter).length - 1;

const shuffleBlock = (client: Client, block: string, kind: string, to: number): void => {
  const { root } = client.state().doc;
  const inner = root.content.find((node) => node.kind === 'element' && node.id === 'q');
  const nested = inner?.kind === 'element' ? inner.content.length : 0;

  switch (kind) {
    case 'type':
      client.insertAt(block, 'x');
      break;
    case 'nest':
      moveInto(client, block, 'q', to % (nested + 1));
      break;
    default:
      moveInto(client, block, root.id, to % (root.content.length + 1));
  }
};

const isQuote = (id: string): boolean => id === 'q' || id === 'q2';

const meshOf = (clients: readonly Client[]): void => {
  for (const one of clients) {
    for (const other of clients) {
      if (one === other) {
        continue;
      }
      send(one, other);
    }
  }
};

const paragraphIds = (node: ElementNode): readonly string[] =>
  node.content.reduce<string[]>(
    (ids, child) => {
      if (child.kind !== 'element') {
        return ids;
      }
      for (const id of paragraphIds(child)) {
        ids.push(id);
      }
      return ids;
    },
    node.type === 'paragraph' ? [node.id] : [],
  );

const carryAround = (client: Client, { kind, block, to }: Turn): void => {
  const { doc } = client.state();
  const target = block === 'q' ? 'q2' : 'q';

  switch (kind) {
    case 'type':
      client.insertAt(block, 'x');
      break;
    case 'nest':
      moveInto(client, block, target, to % ((doc.byId(target)?.content.length ?? 0) + 1));
      break;
    default:
      moveInto(client, block, doc.root.id, to % (doc.root.content.length + 1));
  }
};

const playTurn = (clients: readonly Client[], turn: Turn): void => {
  const client = clients[turn.who];
  const other = clients[turn.peer];

  if (client === undefined) {
    return;
  }
  carryAround(client, turn);

  const kept = !turn.exchanged || other === undefined || other === client;

  if (kept) {
    return;
  }
  send(client, other);
};

describe('yjsBinding convergence', () => {
  it('keeps every letter typed while both sides carry blocks around and into a quote', () => {
    const turn = fc.record({
      side: fc.boolean(),
      kind: fc.constantFrom('type', 'type', 'move', 'nest'),
      block: fc.constantFrom(...MOVABLE),
      to: fc.nat(),
      exchanged: fc.boolean(),
    });

    fc.assert(
      fc.property(fc.array(turn, { minLength: 1, maxLength: 30 }), (turns) => {
        const [left, right] = pair(
          docOf(
            paragraph('a', 'one'),
            paragraph('b', 'two'),
            quote('q', paragraph('e', 'inside')),
            paragraph('c', 'three'),
            paragraph('d', 'four'),
          ),
        );

        const typed = turns.reduce((count, step) => (step.kind === 'type' ? count + 1 : count), 0);

        turns.forEach(({ side, kind, block, to, exchanged }) => {
          shuffleBlock(side ? left : right, block, kind, to);

          if (!exchanged) {
            return;
          }

          exchange(left, right);
        });

        exchange(left, right);

        expect(left.state().doc.root).toEqual(right.state().doc.root);
        expect(fixtureSchema.check(left.state().doc.root).ok).toBe(true);
        expect(lettersIn(left.text(), 'x')).toBe(typed);
        expect(left.binding.read()?.root.content).toEqual(left.state().doc.root.content);
        expect(right.binding.read()?.root.content).toEqual(right.state().doc.root.content);
        expect(listings(right)).toEqual(listings(left));
      }),
      { numRuns: 300 },
    );
  });

  it('loses no paragraph and no letter when three people carry blocks and quotes into each other', () => {
    const turn = fc.record({
      who: fc.nat({ max: 2 }),
      kind: fc.constantFrom('type', 'move', 'nest'),
      block: fc.constantFrom(...CARRIED),
      to: fc.nat(),
      peer: fc.nat({ max: 2 }),
      exchanged: fc.boolean(),
    });

    fc.assert(
      fc.property(fc.array(turn, { minLength: 1, maxLength: 40 }), (turns) => {
        const doc = docOf(
          paragraph('a', 'one'),
          paragraph('b', 'two'),
          quote('q', paragraph('e', 'inside')),
          paragraph('c', 'three'),
          quote('q2', paragraph('d', 'four')),
        );

        const clients = [clientOf(doc), clientOf(doc), clientOf(doc)];

        const typed = turns.reduce(
          (count, step) => (step.kind === 'type' && !isQuote(step.block) ? count + 1 : count),
          0,
        );

        clients[0]?.binding.seed(doc);
        meshOf(clients);

        turns.forEach((step) => {
          playTurn(
            clients,
            step.kind === 'type' && isQuote(step.block) ? { ...step, kind: 'move' } : step,
          );
        });

        meshOf(clients);
        meshOf(clients);

        const roots = clients.map((client) => client.state().doc.root);

        expect(roots.slice(1)).toEqual([roots[0], roots[0]]);

        expect(clients.map((client) => client.binding.read()?.root.content)).toEqual(
          roots.map((root) => root.content),
        );

        expect(roots.map((root) => fixtureSchema.check(root).ok)).toEqual([true, true, true]);
        expect(lettersIn(clients[0]?.text() ?? '', 'x')).toBe(typed);

        expect(
          paragraphIds(roots[0] ?? doc.root)
            .filter((id) => /^[a-e]$/u.test(id))
            .toSorted(),
        ).toEqual(['a', 'b', 'c', 'd', 'e']);
      }),
      { numRuns: 300 },
    );
  });

  const edit = fc.record({
    side: fc.boolean(),
    block: fc.constantFrom('a', 'b'),
    kind: fc.constantFrom('type', 'bold', 'erase'),
    text: fc.string({ minLength: 1, maxLength: 4, unit: fc.constantFrom('x', 'y', 'z') }),
    exchanged: fc.boolean(),
  });

  it('brings both sides to the same valid document', () => {
    fc.assert(
      fc.property(fc.array(edit, { minLength: 1, maxLength: 25 }), (edits) => {
        const [left, right] = pair(docOf(paragraph('a', 'one'), paragraph('b', 'two')));

        edits.forEach(({ side, block, kind, text, exchanged }) => {
          applyEdit(side ? left : right, block, kind, text);

          if (!exchanged) {
            return;
          }

          exchange(left, right);
        });

        exchange(left, right);

        expect(left.state().doc.root).toEqual(right.state().doc.root);
        expect(fixtureSchema.check(left.state().doc.root).ok).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
