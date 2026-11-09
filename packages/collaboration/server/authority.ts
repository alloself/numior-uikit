import { applyStep, stepFromJSON, toJSON, type Doc } from '@numior/editor-core';
import type { WireStep } from '../src/protocol/protocol.types.ts';
import type { RoomAuthority } from './room.ts';

const appliedStep = (doc: Doc, wire: WireStep): Doc | undefined => {
  const step = stepFromJSON(doc.schema, wire);

  if (step === undefined) {
    return undefined;
  }
  try {
    const result = applyStep(doc, step);

    return result.ok ? result.doc : undefined;
  } catch {
    return undefined;
  }
};

export const editorAuthority = (initial: Doc): RoomAuthority => {
  let current = initial;

  return {
    schema: { name: initial.schema.name, version: initial.schema.version },
    snapshot: () => toJSON(current),
    apply: (steps) => {
      const next = steps.reduce<Doc | undefined>(
        (doc, wire) => (doc === undefined ? undefined : appliedStep(doc, wire)),
        current,
      );

      if (next === undefined) {
        return false;
      }
      current = next;
      return true;
    },
  };
};
