import { createDoc, createState, stepToJSON, toJSON, type Doc } from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { describe, expect, it } from 'vite-plus/test';
import { collab, collabVersion, restoredDocument, sendableSteps, type WireStep } from '../src';

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

const typing = (doc: Doc, text: string, at: number): WireStep => {
  const [step] = createState({ doc }).tr.insertText(text, at).steps;

  if (step === undefined) {
    throw new Error('The transaction made no step');
  }
  return stepToJSON(step);
};

const restoring = (pending: readonly WireStep[], snapshot: unknown = toJSON(textDoc('ab'))) =>
  restoredDocument(fixtureSchema, {
    clientId: 'me',
    version: 4,
    snapshot,
    pending,
    alternatives: [],
  });

describe('restoredDocument', () => {
  it('replays the unsent steps over the snapshot', () => {
    const restored = restoring([typing(textDoc('ab'), 'c', 3)]);

    expect(toJSON(restored?.doc ?? textDoc(''))).toEqual(toJSON(textDoc('abc')));
  });

  it('keeps the replayed steps unconfirmed in the plugin', () => {
    const restored = restoring([typing(textDoc('ab'), 'c', 3)]);
    const plugin = collab({ version: 4, unconfirmed: restored?.unconfirmed });
    const state = createState({ doc: restored?.doc ?? textDoc(''), plugins: [plugin] });

    expect(collabVersion(state)).toBe(4);
    expect(sendableSteps(state)).toHaveLength(1);
  });

  it('refuses a snapshot the schema cannot read', () => {
    expect(restoring([], { root: 'nothing' })).toBeUndefined();
  });

  it('refuses steps that no longer apply', () => {
    expect(restoring([{ kind: 'unknown' }])).toBeUndefined();
  });
});
