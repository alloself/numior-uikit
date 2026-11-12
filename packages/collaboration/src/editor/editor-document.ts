import { fromJSON, stepFromJSON, stepToJSON, type Step } from '@numior/editor-core';
import type { CollabDocument } from '../client/client.types';
import type { WireStep } from '../protocol/protocol.types';
import {
  collabVersion,
  confirmSteps,
  conflictsIn,
  receiveSteps,
  sendableSteps,
  settleSteps,
} from './collab';
import type { EditorCollabOptions } from './collab.types';

export const editorCollabDocument = ({
  schema,
  getState,
  dispatch,
  load,
  authorOf,
  onAlternatives,
}: EditorCollabOptions): CollabDocument => {
  const parsedSteps = (steps: readonly WireStep[]): readonly Step[] | undefined =>
    steps.reduce<Step[] | undefined>((parsed, value) => {
      const step = stepFromJSON(schema, value);

      if (parsed === undefined || step === undefined) {
        return undefined;
      }
      parsed.push(step);
      return parsed;
    }, []);

  return {
    version: () => {
      const state = getState();

      return state === undefined ? null : collabVersion(state);
    },
    pending: () => {
      const state = getState();

      return state === undefined ? [] : sendableSteps(state).map(stepToJSON);
    },
    load: (snapshot, version) => {
      const read = fromJSON(schema, snapshot);

      if (read.ok) {
        load(read.doc, version);
      }
      return read.ok;
    },
    receive: (batch) => {
      const state = getState();
      const steps = parsedSteps(batch.steps);

      const tr =
        state === undefined || steps === undefined ? undefined : receiveSteps(state, steps);

      if (tr === undefined) {
        return false;
      }

      const conflicts = conflictsIn(tr);

      dispatch(tr);

      if (conflicts.length > 0) {
        onAlternatives?.(
          conflicts.map(({ index, nodeId, attr, value }) => ({
            version: batch.version + index,
            nodeId,
            attr,
            value,
            clientId: batch.clientId,
            author: authorOf?.(batch.clientId),
            createdAt: new Date().toISOString(),
          })),
        );
      }
      return true;
    },
    confirm: (count, version) => {
      const state = getState();

      if (state === undefined) {
        return;
      }

      dispatch(confirmSteps(state, count, version));
    },
    settle: (count, wires, version) => {
      const state = getState();
      const steps = parsedSteps(wires);

      const tr =
        state === undefined || steps === undefined
          ? undefined
          : settleSteps(state, count, steps, version);

      if (tr !== undefined) {
        dispatch(tr);
      }
      return tr !== undefined;
    },
  };
};
