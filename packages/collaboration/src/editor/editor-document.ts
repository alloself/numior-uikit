import { fromJSON, stepFromJSON, stepToJSON, type Step } from '@numior/editor-core';
import type { CollabDocument } from '../client/client.types';
import type { WireStep } from '../protocol/protocol.types';
import { collabVersion, confirmSteps, receiveSteps, sendableSteps } from './collab';
import type { EditorCollabOptions } from './collab.types';

export const editorCollabDocument = ({
  schema,
  getState,
  dispatch,
  load,
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

      if (state === undefined || steps === undefined) {
        return false;
      }
      dispatch(receiveSteps(state, steps));
      return true;
    },
    confirm: (count, version) => {
      const state = getState();

      if (state !== undefined) {
        dispatch(confirmSteps(state, count, version));
      }
    },
  };
};
