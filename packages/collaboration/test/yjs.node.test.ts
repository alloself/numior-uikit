import {
  createDoc,
  createSchema,
  createState,
  history,
  sameMarks,
  moveBlock,
  setBlockType,
  splitBlock,
  textSelection,
  toJSON,
  undo,
  type ContentNode,
  type Doc,
  type EditorState,
  type ElementNode,
  type Mark,
  type Plugin,
  type TextNode,
  type Transaction,
} from '@numior/editor-core';
import {
  createRandom,
  fixtureSchema,
  generateDoc,
  type Random,
} from '@numior/editor-core/fixtures';
import * as fc from 'fast-check';
import { describe, expect, it, vi } from 'vite-plus/test';
import {
  applyUpdate,
  decodeUpdate,
  Doc as YDoc,
  encodeStateAsUpdate,
  encodeStateVector,
  Array as YArray,
  Map as YMap,
  XmlText,
} from 'yjs';
import { yjsBinding, type YjsBinding } from '../src/yjs';
import { applyDocChange } from '../src/yjs/doc-change';

interface Client {
  readonly ydoc: YDoc;
  readonly binding: YjsBinding;
  readonly state: () => EditorState;
  readonly apply: (build: (state: EditorState) => Transaction) => void;
  readonly insertAt: (id: string, text: string) => void;
  readonly undo: () => void;
  readonly text: () => string;
  readonly received: () => readonly Transaction[];
}

type Flat = { readonly text: string; readonly marks: readonly Mark[] } | { readonly node: unknown };

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

const KEYSTROKE_BUDGET_MS = 2;

const KEYSTROKES = 20;

const WIDE_RUNS = 60;

const WIDE_ROUNDS = 12;

const WIDE_COUNT = 70;

const HISTORY_EDITS = 400;

const IDLE = { getState: () => undefined, dispatch: () => undefined };

const MOVABLE = ['a', 'b', 'c', 'd'] as const;

const CARRIED = ['a', 'b', 'c', 'd', 'e', 'q', 'q2'] as const;

const SPARE = 'spare-';

const CHANGED = 0.4;

const MARK_RANK = [...fixtureSchema.marks.keys()];

const BOLD = fixtureSchema.mark('bold');

const PLAIN_QUOTES = createSchema({
  ...fixtureSchema.spec,
  version: 2,
  nodes: {
    ...fixtureSchema.spec.nodes,
    blockquote: { ...fixtureSchema.spec.nodes.blockquote, content: 'paragraph+' },
  },
});

const MENTIONED: ReadonlySet<string> = new Set(['paragraph', 'heading']);

const RELABELLED = 'Renamed';

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
  schema = fixtureSchema,
): Client => {
  let state: EditorState | undefined;
  const received: Transaction[] = [];

  const binding = yjsBinding(ydoc, BLOCKS, {
    schema,
    getState: () => state,
    dispatch: (tr) => {
      if (state === undefined) {
        return;
      }

      const before = state;

      received.push(tr);

      state = state.apply(tr);
      emit(binding.plugin, state, before);
    },
    onInvalid,
  });

  state = createState({ doc, plugins: [binding.plugin, ...extra], ids: binding.ids });

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
    received: () => received,
  };
};

const enterAfter = (client: Client, id: string, text: string): void => {
  client.apply((from) => {
    const at = (from.doc.positionOf(id) ?? 0) + (from.doc.byId(id)?.size ?? 2) - 1;

    return from.tr.setSelection(textSelection(at));
  });

  splitBlock(client.state(), (tr) => {
    client.apply(() => tr);
  });

  client.apply((from) => from.tr.insertText(text));
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

const pair = (doc: Doc, extra: () => readonly Plugin[] = () => []): readonly [Client, Client] => {
  const left = clientOf(doc, undefined, new YDoc(), extra());
  const right = clientOf(doc, undefined, new YDoc(), extra());

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

const boldOf = (node: ContentNode): string => {
  if (node.kind === 'text') {
    return node.marks.some((mark) => mark.type === 'bold') ? node.text : '';
  }
  return node.content.map(boldOf).join('');
};

const ranked = (marks: readonly Mark[]): readonly Mark[] =>
  marks.toSorted((one, other) => MARK_RANK.indexOf(one.type) - MARK_RANK.indexOf(other.type));

const renamed = (node: ElementNode): ElementNode =>
  fixtureSchema.element(node.type, {
    id: `${SPARE}${node.id}`,
    attrs: node.attrs,
    content: node.content.map((child) => (child.kind === 'element' ? renamed(child) : child)),
  });

const editedText = (node: TextNode, random: Random): TextNode => {
  const at = random.int(0, node.text.length - 1);
  const shorter = node.text.length > 1 && random.chance(0.5);

  return fixtureSchema.text(
    shorter
      ? node.text.slice(0, at) + node.text.slice(at + 1)
      : `${node.text.slice(0, at)}Z${node.text.slice(at)}`,
    node.marks,
  );
};

const toggledBold = (node: TextNode): TextNode =>
  fixtureSchema.text(
    node.text,
    node.marks.some((mark) => mark.type === 'bold')
      ? node.marks.filter((mark) => mark.type !== 'bold')
      : ranked([...node.marks, BOLD]),
  );

const withMentions = (node: ElementNode): ElementNode =>
  fixtureSchema.element(node.type, {
    id: node.id,
    attrs: node.attrs,
    content: MENTIONED.has(node.type)
      ? [
          ...node.content,
          fixtureSchema.element('mention', {
            id: `m-${node.id}`,
            attrs: { user: node.id, label: node.id },
          }),
        ]
      : node.content.map((child) => (child.kind === 'element' ? withMentions(child) : child)),
  });

const relabelled = (node: ElementNode): ElementNode =>
  fixtureSchema.element(node.type, {
    id: node.id,
    attrs: { ...node.attrs, label: RELABELLED },
    content: node.content,
  });

const changedLine = (node: ElementNode, random: Random): readonly ContentNode[] => {
  const bold = fixtureSchema.nodes.get(node.type)?.marks.has('bold') === true;

  return node.content.map((child) => {
    if (!random.chance(CHANGED)) {
      return child;
    }
    if (child.kind === 'element') {
      return relabelled(child);
    }
    return bold && random.chance(0.5) ? toggledBold(child) : editedText(child, random);
  });
};

const changedNode = (node: ElementNode, random: Random): ElementNode => {
  if (!random.chance(CHANGED)) {
    return node;
  }

  const content =
    fixtureSchema.nodes.get(node.type)?.inlineContent === true
      ? changedLine(node, random)
      : node.content.map((child) =>
          child.kind === 'element' ? changedNode(child, random) : child,
        );

  return fixtureSchema.element(node.type, { id: node.id, attrs: node.attrs, content });
};

const swapped = (blocks: ContentNode[], random: Random): void => {
  const one = random.int(0, blocks.length - 1);
  const other = random.int(0, blocks.length - 1);
  const first = blocks[one];
  const second = blocks[other];

  if (first === undefined || second === undefined) {
    return;
  }
  blocks[one] = second;
  blocks[other] = first;
};

const nestedInQuote = (blocks: ContentNode[], random: Random): void => {
  const at = random.int(0, blocks.length - 1);

  const into = blocks.findIndex(
    (block, index) => index !== at && block.kind === 'element' && block.type === 'blockquote',
  );

  const moved = blocks[at];
  const quote = blocks[into];

  if (moved === undefined || quote?.kind !== 'element') {
    return;
  }

  blocks[into] = fixtureSchema.element(quote.type, {
    id: quote.id,
    attrs: quote.attrs,
    content: [...quote.content, moved],
  });

  blocks.splice(at, 1);
};

const changedRoot = (
  root: ElementNode,
  random: Random,
  spares: readonly ContentNode[],
): ElementNode => {
  const blocks = root.content.map((child) =>
    child.kind === 'element' ? changedNode(child, random) : child,
  );

  if (blocks.length > 1 && random.chance(0.3)) {
    blocks.splice(random.int(0, blocks.length - 1), 1);
  }
  if (random.chance(0.3)) {
    swapped(blocks, random);
  }
  if (random.chance(0.3)) {
    nestedInQuote(blocks, random);
  }
  for (const spare of spares) {
    if (!random.chance(0.3)) {
      continue;
    }
    blocks.splice(random.int(0, blocks.length), 0, spare);
  }
  return fixtureSchema.element(root.type, { id: root.id, attrs: root.attrs, content: blocks });
};

const flatOf = (content: readonly ContentNode[]): readonly Flat[] =>
  content.reduce<Flat[]>((flat, child) => {
    const last = flat.at(-1);

    if (
      child.kind === 'text' &&
      last !== undefined &&
      'text' in last &&
      sameMarks(last.marks, child.marks)
    ) {
      flat[flat.length - 1] = { text: last.text + child.text, marks: last.marks };
      return flat;
    }

    flat.push(
      child.kind === 'text' ? { text: child.text, marks: child.marks } : { node: canonical(child) },
    );

    return flat;
  }, []);

const canonical = (node: ElementNode): unknown => ({
  id: node.id,
  type: node.type,
  attrs: node.attrs,
  content: flatOf(node.content),
});

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

  it('gives the blocks two people make by pressing Enter at once ids of their own', () => {
    const [left, right] = pair(docOf(paragraph('a', 'one'), paragraph('b', 'two')));

    enterAfter(left, 'a', 'LEFT');
    enterAfter(right, 'b', 'RIGHT');

    exchange(left, right);

    expect(left.text()).toBe('one|LEFT|two|RIGHT');
    expect(right.text()).toBe('one|LEFT|two|RIGHT');
    expect(toJSON(left.state().doc)).toEqual(toJSON(right.state().doc));
  });

  it('writes nothing into Yjs from an editor that makes block ids of its own', () => {
    const ydoc = new YDoc();
    let state: EditorState | undefined;

    const binding = yjsBinding(ydoc, BLOCKS, {
      schema: fixtureSchema,
      getState: () => state,
      dispatch: () => undefined,
    });

    const doc = docOf(paragraph('a', 'one'));

    binding.seed(doc);
    state = createState({ doc, plugins: [binding.plugin] });

    const written = encodeStateVector(ydoc);
    const before = state;
    const next = before.apply(before.tr.insertText('x', 1));

    expect(() => {
      emit(binding.plugin, next, before);
    }).toThrow('binding.ids');

    expect(encodeStateVector(ydoc)).toEqual(written);
  });

  it('reads one update with edits in two far blocks as two edits and keeps an edit between them undoable', () => {
    const blocks = Array.from({ length: 10 }, (_unused, index) =>
      paragraph(`p${String(index)}`, `Paragraph ${String(index)}`),
    );

    const [left, right] = pair(docOf(...blocks), () => [history()]);

    left.insertAt('p4', 'mine');
    send(left, right);
    right.insertAt('p1', 'X');
    right.insertAt('p8', 'Y');

    send(right, left);

    const steps = left.received().at(-1)?.steps ?? [];

    expect(
      steps.map((step) => (step.kind === 'replace' ? step.to - step.from : step.kind)),
    ).toEqual([0, 0]);

    left.undo();

    expect(left.text().split('|')).toEqual(
      blocks.map((block, index) => {
        const texts: Readonly<Record<number, string>> = { 1: 'XParagraph 1', 8: 'YParagraph 8' };

        return texts[index] ?? textOf(block);
      }),
    );
  });

  it('reads bold put on a word as a mark and leaves the caret in the word and the undo of typing in it alone', () => {
    const [left, right] = pair(docOf(paragraph('a', 'hello world')), () => [history()]);
    const word = 1 + 'hello '.length;

    left.apply((from) => from.tr.insertText('X', word + 2));
    send(left, right);
    left.apply((from) => from.tr.setSelection(textSelection(word + 3)));
    right.apply((from) => from.tr.addMark(word, word + 'woXrld'.length, BOLD));

    send(right, left);

    expect(
      left
        .received()
        .at(-1)
        ?.steps.map((step) => step.kind),
    ).toEqual(['addMark']);

    expect(left.state().selection).toMatchObject({ anchor: word + 3, head: word + 3 });

    left.undo();

    expect(left.text()).toBe('hello world');
    expect(boldOf(left.state().doc.root)).toBe('world');
  });

  it('brings a document to any other that shares its blocks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2_147_483_647 }),
        fc.integer({ min: 1, max: 14 }),
        (seed, size) => {
          const before = createDoc(
            fixtureSchema,
            withMentions(generateDoc(fixtureSchema, { blocks: size, seed }).root),
          );

          const spares = generateDoc(fixtureSchema, { blocks: 2, seed: seed + 1 }).root.content;

          const after = changedRoot(
            before.root,
            createRandom(seed + 2),
            spares.map((spare) =>
              spare.kind === 'element' ? renamed(withMentions(spare)) : spare,
            ),
          );

          fc.pre(fixtureSchema.check(after).ok);

          const tr = applyDocChange(
            createState({ doc: before }).tr,
            before.root,
            after,
            fixtureSchema,
          );

          expect(canonical(tr.doc.root)).toEqual(canonical(after));
        },
      ),
      { numRuns: 300 },
    );
  });

  it('leaves a list in a quote alone for someone whose schema has other rules and tells them', () => {
    const doc = docOf(paragraph('a', 'one'), quote('q', paragraph('qp', 'quoted')));
    const invalid = vi.fn<() => void>();
    const left = clientOf(doc);
    const right = clientOf(doc, invalid, new YDoc(), [], PLAIN_QUOTES);

    left.binding.seed(doc);
    exchange(left, right);

    const seeded = encodeStateVector(right.ydoc);

    right.insertAt('a', 'X');

    expect(encodeStateVector(right.ydoc)).toEqual(seeded);

    const list = fixtureSchema.element('bullet_list', {
      id: 'list',
      content: [
        fixtureSchema.element('list_item', { id: 'item', content: [paragraph('ip', 'listed')] }),
      ],
    });

    left.apply((from) => {
      const at = (from.doc.positionOf('q') ?? 0) + (from.doc.byId('q')?.size ?? 2) - 1;

      return from.tr.insert(at, [list]);
    });

    exchange(left, right);

    expect(invalid).toHaveBeenCalled();
    expect(left.text()).toBe('one|quotedlisted');
    expect(left.binding.read()?.root.content).toEqual(left.state().doc.root.content);
  });

  it('writes in the right place of a list that keeps the id of a block deleted while it moved', () => {
    const [left, right] = pair(
      docOf(
        paragraph('a', 'A'),
        paragraph('b', 'B'),
        paragraph('c', 'C'),
        paragraph('d', 'D'),
        paragraph('e', 'E'),
      ),
    );

    left.apply((from) => {
      const at = from.doc.positionOf('b') ?? 0;

      return from.tr.delete(at, at + (from.doc.byId('b')?.size ?? 0));
    });

    carry(right, 'b', 'd');
    exchange(left, right);

    left.apply((from) => from.tr.insert(from.doc.positionOf('e') ?? 0, [paragraph('n', 'N')]));
    send(left, right);

    expect(right.text()).toBe('A|C|D|N|E');

    left.apply((from) => from.tr.delete(0, from.doc.byId('a')?.size ?? 0));
    carry(left, 'e', 'd');
    send(left, right);

    expect(right.text()).toBe('C|E|D|N');
    expect(right.binding.read()?.root.content).toEqual(left.state().doc.root.content);
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

  it(
    'takes in a keystroke of someone else in a document of eighteen thousand blocks within two milliseconds',
    { tags: ['budget'] },
    () => {
      const [left, right] = pair(numbered(18_000));
      const times: number[] = [];

      for (let stroke = 0; stroke < KEYSTROKES; stroke += 1) {
        left.insertAt('p9000', 'x');

        const update = encodeStateAsUpdate(left.ydoc, encodeStateVector(right.ydoc));
        const started = performance.now();

        applyUpdate(right.ydoc, update);
        times.push(performance.now() - started);
      }

      expect(times.toSorted((one, other) => one - other)[KEYSTROKES / 2]).toBeLessThan(
        KEYSTROKE_BUDGET_MS,
      );

      expect(right.text()).toBe(left.text());
    },
  );

  it('carries several edits of one update in a document with wide lists to the other side', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2_147_483_647 }), (seed) => {
        const random = createRandom(seed);
        const [left, right] = pair(wideDoc());
        const ids = paragraphIds(left.state().doc.root);

        for (let round = 0; round < WIDE_ROUNDS; round += 1) {
          const [writer, reader] = random.chance(0.5) ? [left, right] : [right, left];
          const edits = random.int(1, 6);

          for (let edit = 0; edit < edits; edit += 1) {
            editedLine(writer, random, ids);
          }
          send(writer, reader);

          expect(reader.state().doc.root).toEqual(writer.state().doc.root);
        }
      }),
      { numRuns: WIDE_RUNS },
    );
  });

  it('opens a document written anew into an empty Y.Doc the same, smaller and ready for edits', () => {
    const random = createRandom(7);
    const [author] = pair(docOf(paragraph('a', 'Start')));

    for (let edit = 0; edit < HISTORY_EDITS; edit += 1) {
      lived(author, random);
    }

    const stored = encodeStateAsUpdate(author.ydoc);
    const small = compacted(stored);

    expect(storedDoc(small)?.root).toEqual(author.state().doc.root);
    expect(small.length).toBeLessThan(stored.length / 2);

    expect(decodeUpdate(small).structs.length).toBeLessThan(
      decodeUpdate(stored).structs.length / 2,
    );

    const opened = storedDoc(small);

    if (opened === undefined) {
      throw new Error('The compacted document does not read');
    }

    const [left, right] = [clientOf(opened), clientOf(opened)];

    applyUpdate(left.ydoc, small);
    applyUpdate(right.ydoc, small);

    left.insertAt(
      opened.root.content[0]?.kind === 'element' ? opened.root.content[0].id : 'a',
      'new ',
    );

    exchange(left, right);

    expect(right.text()).toBe(left.text());
    expect(left.text()).toMatch(/^new /u);
  });

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

const wideDoc = (): Doc =>
  docOf(
    ...Array.from({ length: WIDE_COUNT }, (_unused, index) =>
      paragraph(`w${String(index)}`, `Top ${String(index)}`),
    ),
    fixtureSchema.element('ordered_list', {
      id: 'list',
      content: Array.from({ length: WIDE_COUNT }, (_unused, index) =>
        fixtureSchema.element('list_item', {
          id: `i${String(index)}`,
          content: [paragraph(`ip${String(index)}`, `Item ${String(index)}`)],
        }),
      ),
    }),
    quote(
      'wide-quote',
      ...Array.from({ length: WIDE_COUNT }, (_unused, index) =>
        paragraph(`q${String(index)}`, `Quoted ${String(index)}`),
      ),
    ),
  );

const HIGH_SURROGATES = /[\uD800-\uDBFF]/u;

const wholeAt = (text: string, offset: number): number =>
  HIGH_SURROGATES.test(text.charAt(offset - 1)) ? offset + 1 : offset;

const editedLine = (client: Client, random: Random, ids: readonly string[]): void => {
  const id = ids[random.int(0, ids.length - 1)] ?? 'w0';

  client.apply((from) => {
    const block = from.doc.byId(id);
    const text = block === undefined ? '' : textOf(block);
    const start = (from.doc.positionOf(id) ?? 0) + 1;
    const at = start + wholeAt(text, random.int(0, text.length));

    if (random.chance(0.1)) {
      return from.tr.setNodeAttrs(from.doc.positionOf('list') ?? 0, { start: random.int(1, 9) });
    }
    if (random.chance(0.2) && text.length > 1) {
      return from.tr.addMark(start, start + text.length, fixtureSchema.mark('bold'));
    }
    if (random.chance(0.3) && text.length > 0) {
      return from.tr.delete(start, start + wholeAt(text, random.int(1, text.length)));
    }
    return from.tr.insertText(random.pick(['a', 'bc', 'Ж', '😀']), at);
  });
};

const compacted = (stored: Uint8Array): Uint8Array => {
  const old = new YDoc();

  applyUpdate(old, stored);

  const doc = yjsBinding(old, BLOCKS, { schema: fixtureSchema, ...IDLE }).read();

  if (doc === undefined) {
    return stored;
  }

  const fresh = new YDoc();

  yjsBinding(fresh, BLOCKS, { schema: fixtureSchema, ...IDLE }).seed(doc);
  return encodeStateAsUpdate(fresh);
};

const storedDoc = (bytes: Uint8Array): Doc | undefined => {
  const ydoc = new YDoc();

  applyUpdate(ydoc, bytes);
  return yjsBinding(ydoc, BLOCKS, { schema: fixtureSchema, ...IDLE }).read();
};

const lived = (client: Client, random: Random): void => {
  const blocks = client
    .state()
    .doc.root.content.flatMap((block) => (block.kind === 'element' ? [block.id] : []));

  const id = blocks[random.int(0, blocks.length - 1)] ?? 'a';
  const goal = blocks[random.int(0, blocks.length - 1)];
  const roll = random.int(0, 9);

  if (roll < 4) {
    enterAfter(client, id, `line ${String(random.int(0, 999))}`);
    return;
  }
  if (roll < 7) {
    client.insertAt(id, 'typed ');
    return;
  }
  if (roll < 9 && blocks.length > 8) {
    client.apply((from) => {
      const at = from.doc.positionOf(id) ?? 0;

      return from.tr.delete(at, at + (from.doc.byId(id)?.size ?? 0));
    });

    return;
  }
  if (goal === id || goal === blocks[blocks.indexOf(id) + 1]) {
    return;
  }
  carry(client, id, goal);
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
