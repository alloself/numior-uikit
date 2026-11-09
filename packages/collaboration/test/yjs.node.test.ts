import {
  createDoc,
  createState,
  history,
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
import { applyUpdate, Doc as YDoc, encodeStateAsUpdate, XmlElement, XmlText } from 'yjs';
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

const FRAGMENT = 'document';

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

  const binding = yjsBinding(ydoc, ydoc.getXmlFragment(FRAGMENT), {
    schema: fixtureSchema,
    getState: () => state,
    dispatch: (tr) => {
      if (state !== undefined) {
        const before = state;

        state = state.apply(tr);
        emit(binding.plugin, state, before);
      }
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

const exchange = (left: Client, right: Client): void => {
  applyUpdate(right.ydoc, encodeStateAsUpdate(left.ydoc));
  applyUpdate(left.ydoc, encodeStateAsUpdate(right.ydoc));
};

const pair = (doc: Doc): readonly [Client, Client] => {
  const left = clientOf(doc);
  const right = clientOf(doc);

  left.binding.seed(doc);
  exchange(left, right);
  return [left, right];
};

const removeItem = (client: Client, id: string): void => {
  client.ydoc.transact(() => {
    const items = client.ydoc.getXmlFragment(FRAGMENT).get(1);

    if (items instanceof XmlElement) {
      items.delete(
        items
          .toArray()
          .findIndex((child) => child instanceof XmlElement && child.getAttribute('nui:id') === id),
        1,
      );
    }
  });
};

describe('yjsBinding', () => {
  it('reads a seeded document back', () => {
    const doc = docOf(paragraph('a', 'Hello'), paragraph('b', 'World'));
    const client = clientOf(doc);

    client.binding.seed(doc);

    expect(client.binding.read()?.root.content).toEqual(doc.root.content);
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

    removeItem(left, 'item0');
    removeItem(right, 'item1');
    exchange(left, right);

    expect(fixtureSchema.check(left.state().doc.root).ok).toBe(true);
    expect(left.text()).toBe('keep');
    expect(right.text()).toBe('keep');
  });

  it('reports a tree from an unknown schema and leaves it alone', () => {
    const onInvalid = vi.fn<() => void>();
    const doc = docOf(paragraph('a', 'Hello'));
    const client = clientOf(doc, onInvalid);
    const fragment = client.ydoc.getXmlFragment(FRAGMENT);

    client.binding.seed(doc);

    client.ydoc.transact(() => {
      const foreign = new XmlElement('hologram');

      fragment.insert(1, [foreign]);
      foreign.setAttribute('nui:id', 'alien');
      foreign.insert(0, [new XmlText('?')]);
    });

    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(fragment.length).toBe(2);
    expect(client.text()).toBe('Hello');
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

describe('yjsBinding convergence', () => {
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

          if (exchanged) {
            exchange(left, right);
          }
        });

        exchange(left, right);

        expect(left.state().doc.root).toEqual(right.state().doc.root);
        expect(fixtureSchema.check(left.state().doc.root).ok).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
