import {
  applyStep,
  invertStep,
  rebaseSteps,
  stepFromJSON,
  stepMapOf,
  stepToJSON,
  toJSON,
  type Doc,
  type Step,
} from '@numior/editor-core';
import type { WireStep } from '../protocol/protocol.types.ts';
import type { RoomAuthority } from './room.ts';

interface Applied {
  readonly step: Step;
  readonly inverse: Step;
}

interface Progress {
  readonly doc: Doc;
  readonly applied: readonly Applied[];
  readonly before: readonly Doc[];
}

export interface EditorAuthorityOptions {
  readonly window?: number | undefined;
}

const WINDOW = 4096;

const stepped = (doc: Doc, step: Step): Doc | undefined => {
  try {
    const result = applyStep(doc, step);

    return result.ok ? result.doc : undefined;
  } catch {
    return undefined;
  }
};

const parsed = (doc: Doc, wires: readonly WireStep[]): readonly Step[] | undefined =>
  wires.reduce<Step[] | undefined>((steps, wire) => {
    const step = steps === undefined ? undefined : stepFromJSON(doc.schema, wire);

    if (steps === undefined || step === undefined) {
      return undefined;
    }
    steps.push(step);
    return steps;
  }, []);

const advanced = (from: Progress | undefined, step: Step): Progress | undefined => {
  const doc = from === undefined ? undefined : stepped(from.doc, step);

  return from === undefined || doc === undefined
    ? undefined
    : {
        doc,
        applied: [...from.applied, { step, inverse: invertStep(step, from.doc) }],
        before: [...from.before, from.doc],
      };
};

const run = (doc: Doc, steps: readonly Step[]): Progress | undefined =>
  steps.reduce<Progress | undefined>(advanced, { doc, applied: [], before: [] });

const moved = (
  current: Doc,
  missed: readonly Applied[],
  steps: readonly Step[],
): Progress | undefined => {
  const base = run(
    current,
    missed.toReversed().map((item) => item.inverse),
  );

  const written = base === undefined ? undefined : run(base.doc, steps);

  if (written === undefined) {
    return undefined;
  }

  let progress: Progress = { doc: current, applied: [], before: [] };

  rebaseSteps(
    steps,
    { maps: missed.map((item) => stepMapOf(item.step)), mirrors: new Map() },
    (step) => {
      const next = advanced(progress, step);

      progress = next ?? progress;
      return next !== undefined;
    },
    { written: (index) => written.before[index] ?? written.doc, current: () => progress.doc },
  );

  return progress;
};

export const editorAuthority = (
  initial: Doc,
  { window = WINDOW }: EditorAuthorityOptions = {},
): RoomAuthority => {
  let current = initial;
  let tail: readonly Applied[] = [];

  const kept = (progress: Progress): void => {
    current = progress.doc;
    tail = [...tail, ...progress.applied].slice(-window);
  };

  return {
    schema: { name: initial.schema.name, version: initial.schema.version },
    snapshot: () => toJSON(current),
    apply: (wires) => {
      const steps = parsed(current, wires);
      const progress = steps === undefined ? undefined : run(current, steps);

      if (progress === undefined) {
        return false;
      }
      kept(progress);
      return true;
    },
    rebase: (wires, behind) => {
      const steps = behind > tail.length ? undefined : parsed(current, wires);

      const progress =
        steps === undefined ? undefined : moved(current, tail.slice(tail.length - behind), steps);

      if (progress === undefined) {
        return undefined;
      }
      kept(progress);
      return progress.applied.map((item) => stepToJSON(item.step));
    },
  };
};
