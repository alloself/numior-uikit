import {
  applyStep,
  fromJSON,
  invertStep,
  stepFromJSON,
  type Doc,
  type Schema,
} from '@numior/editor-core';
import type { CollabRestored } from '../client/client.types';
import type { WireStep } from '../protocol/protocol.types';
import type { RestoredDocument, UnconfirmedStep } from './collab.types';

const replayed = (
  schema: Schema,
  start: Doc,
  pending: readonly WireStep[],
): RestoredDocument | undefined => {
  const unconfirmed: UnconfirmedStep[] = [];

  const doc = pending.reduce<Doc | undefined>((current, value) => {
    const step = stepFromJSON(schema, value);

    if (current === undefined || step === undefined) {
      return undefined;
    }

    const applied = applyStep(current, step);

    if (!applied.ok) {
      return undefined;
    }
    unconfirmed.push({ step, inverted: invertStep(step, current) });
    return applied.doc;
  }, start);

  return doc === undefined ? undefined : { doc, unconfirmed };
};

export const restoredDocument = (
  schema: Schema,
  restored: CollabRestored,
): RestoredDocument | undefined => {
  const read = fromJSON(schema, restored.snapshot);

  return read.ok ? replayed(schema, read.doc, restored.pending) : undefined;
};
