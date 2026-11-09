import { createDoc, createState, stepToJSON, toJSON, type Doc } from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { IDBFactory } from 'fake-indexeddb';
import type { WireStep } from '@numior/collaboration';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  deleteOfflineDocument,
  openOfflineStore,
  type OfflineStep,
  type OfflineStore,
} from '../src';

const DOC = 'doc';

const textDoc = (text: string): Doc =>
  createDoc(
    fixtureSchema,
    fixtureSchema.element(fixtureSchema.top.name, {
      id: 'root',
      content: [
        fixtureSchema.element('paragraph', {
          id: 'p',
          content: text === '' ? [] : [fixtureSchema.text(text)],
        }),
      ],
    }),
  );

const inserting = (doc: Doc, text: string, at: number): WireStep => {
  const [step] = createState({ doc }).tr.insertText(text, at).steps;

  if (step === undefined) {
    throw new Error('The transaction made no step');
  }
  return stepToJSON(step);
};

const logOf = (texts: readonly string[], from = 0): readonly OfflineStep[] =>
  texts.map((text, index) => ({
    version: from + index,
    step: inserting(textDoc(texts.slice(0, index).join('')), text, 1 + index),
  }));

const opened: OfflineStore[] = [];

const open = async (
  factory = new IDBFactory(),
  compactAfter?: number,
): Promise<{ store: OfflineStore; factory: IDBFactory }> => {
  const store = await openOfflineStore(DOC, {
    schema: fixtureSchema,
    plugins: { history: 2 },
    factory,
    compactAfter,
  });

  opened.push(store);
  return { store, factory };
};

const snapshotOf = (text: string, version: number) => ({
  version,
  document: toJSON(textDoc(text)),
});

afterEach(() => {
  opened.splice(0).forEach((store) => {
    store.close();
  });
});

describe('offline store', () => {
  it('holds nothing for a new document', async () => {
    const { store } = await open();

    await expect(store.read()).resolves.toBeUndefined();
  });

  it('keeps the snapshot with the schema and plugin versions', async () => {
    const { store } = await open();

    await store.writeSnapshot(snapshotOf('one', 4));

    await expect(store.read()).resolves.toMatchObject({
      meta: {
        schema: { name: fixtureSchema.name, version: fixtureSchema.version },
        plugins: { history: 2 },
      },
      snapshot: snapshotOf('one', 4),
      steps: [],
    });
  });

  it('returns steps after the snapshot in order', async () => {
    const { store } = await open();
    const steps = logOf(['a', 'b'], 4);

    await store.writeSnapshot(snapshotOf('', 4));
    await store.appendSteps([...steps].toReversed());

    await expect(store.read()).resolves.toMatchObject({ steps });
  });

  it('stops the log at a gap', async () => {
    const { store } = await open();
    const [first, , third] = logOf(['a', 'b', 'c'], 4);

    await store.writeSnapshot(snapshotOf('', 4));
    await store.appendSteps([first, third].flatMap((step) => (step === undefined ? [] : [step])));

    const state = await store.read();

    expect(state?.steps.map((step) => step.version)).toEqual([4]);
  });

  it('survives closing and opening again', async () => {
    const { store, factory } = await open();

    await store.writeSnapshot(snapshotOf('saved', 2));
    store.close();

    const { store: again } = await open(factory);

    await expect(again.read()).resolves.toMatchObject({ snapshot: snapshotOf('saved', 2) });
  });

  it('does not replace a newer snapshot with an older one', async () => {
    const { store } = await open();

    await store.writeSnapshot(snapshotOf('newer', 9));
    await store.writeSnapshot(snapshotOf('older', 3));

    await expect(store.read()).resolves.toMatchObject({ snapshot: snapshotOf('newer', 9) });
  });

  it('drops steps a new snapshot already covers', async () => {
    const { store } = await open();

    await store.writeSnapshot(snapshotOf('', 0));
    await store.appendSteps(logOf(['a', 'b', 'c']));

    await store.writeSnapshot(snapshotOf('ab', 2));

    const state = await store.read();

    expect(state?.steps.map((step) => step.version)).toEqual([2]);
  });

  it('compacts the log into a snapshot of the replayed document', async () => {
    const { store } = await open();

    await store.writeSnapshot(snapshotOf('', 0));
    await store.appendSteps(logOf(['a', 'b']));

    await expect(store.compact()).resolves.toBe(true);

    const state = await store.read();

    expect(state?.snapshot.version).toBe(2);
    expect(state?.steps).toEqual([]);
    expect(JSON.stringify(state?.snapshot.document)).toContain('ab');
  });

  it('has nothing to compact without steps', async () => {
    const { store } = await open();

    await store.writeSnapshot(snapshotOf('', 0));

    await expect(store.compact()).resolves.toBe(false);
  });

  it('compacts by itself past the limit', async () => {
    const { store } = await open(new IDBFactory(), 2);

    await store.writeSnapshot(snapshotOf('', 0));
    await store.appendSteps(logOf(['a', 'b', 'c']));

    const state = await store.read();

    expect(state?.snapshot.version).toBe(3);
    expect(state?.steps).toEqual([]);
  });

  it('keeps the log when a step cannot be replayed', async () => {
    const { store } = await open();
    const unknown: OfflineStep = { version: 0, step: { kind: 'nonsense' } };

    await store.writeSnapshot(snapshotOf('', 0));
    await store.appendSteps([unknown]);

    await expect(store.compact()).resolves.toBe(false);
    await expect(store.read()).resolves.toMatchObject({ steps: [unknown] });
  });

  it('ignores a damaged snapshot', async () => {
    const { store, factory } = await open();

    await store.writeSnapshot(snapshotOf('', 0));
    store.close();

    const raw = factory.open(`nui-offline:${DOC}`);

    await new Promise((resolve) => {
      raw.onsuccess = resolve;
    });

    const write = raw.result.transaction('snapshot', 'readwrite');

    write.objectStore('snapshot').put({ version: 'broken' }, 'current');

    await new Promise((resolve) => {
      write.oncomplete = resolve;
    });

    raw.result.close();

    const { store: again } = await open(factory);

    await expect(again.read()).resolves.toBeUndefined();
  });

  it('deletes a document', async () => {
    const { store, factory } = await open();

    await store.writeSnapshot(snapshotOf('', 0));
    store.close();

    await deleteOfflineDocument(DOC, factory);

    const { store: again } = await open(factory);

    await expect(again.read()).resolves.toBeUndefined();
  });
});
