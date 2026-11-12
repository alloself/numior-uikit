import {
  createMapping,
  createMetaKey,
  definePlugin,
  invertStep,
  mapSelection,
  mirrored,
  rebaseSteps,
  remoteChain,
  remoteChange,
  stepMapOf,
  stepToJSON,
  type EditorState,
  type Mappable,
  type MirrorMaps,
  type Plugin,
  type Step,
  type StepMap,
  type Transaction,
} from '@numior/editor-core';
import type {
  AttrConflict,
  CollabOptions,
  CollabProgress,
  CollabState,
  UnconfirmedStep,
} from './collab.types';
import { attrConflicts } from './conflicts';

interface RebasedLocal {
  readonly unconfirmed: readonly UnconfirmedStep[];
  readonly chain: MirrorMaps;
  readonly conflicts: readonly AttrConflict[];
}

const NONE: CollabState = { version: 0, unconfirmed: [], trail: [] };

const TRAIL = 512;

const collabUpdate = createMetaKey<CollabState>('collabUpdate');

const collabConflicts = createMetaKey<readonly AttrConflict[]>('collabConflicts');

const registry = new WeakMap<object, Plugin<CollabState>>();

const localSteps = (tr: Transaction): readonly UnconfirmedStep[] =>
  tr.steps.map((step, index) => ({
    step,
    inverted: invertStep(step, tr.docs[index] ?? tr.before),
  }));

const applyCollab = (tr: Transaction, value: CollabState): CollabState => {
  const update = collabUpdate.read(tr);

  if (update !== undefined) {
    return update;
  }
  return tr.changed ? { ...value, unconfirmed: [...value.unconfirmed, ...localSteps(tr)] } : value;
};

const collabStateIn = (state: EditorState): CollabState | undefined => {
  for (const plugin of state.plugins) {
    const found = registry.get(plugin);

    if (found !== undefined) {
      return found.getState(state) ?? NONE;
    }
  }
  return undefined;
};

const collabStateOf = (state: EditorState): CollabState => collabStateIn(state) ?? NONE;

const grown = (trail: readonly StepMap[], maps: readonly StepMap[]): readonly StepMap[] =>
  [...trail, ...maps].slice(-TRAIL);

const mapsOf = (steps: readonly UnconfirmedStep[]): StepMap[] =>
  steps.map((item) => stepMapOf(item.step));

const taken = (tr: Transaction, steps: readonly Step[]): boolean =>
  steps.every((step) => tr.maybeStep(step).ok);

const rebaseLocal = (
  tr: Transaction,
  remote: readonly Step[],
  unconfirmed: readonly UnconfirmedStep[],
): RebasedLocal | undefined => {
  const undone = unconfirmed.toReversed().map((item) => item.inverted);

  if (!taken(tr, undone) || !taken(tr, remote)) {
    return undefined;
  }

  const conflicts = attrConflicts(tr.docs, remote, unconfirmed);
  const first = tr.steps.length;

  const { steps, chain } = rebaseSteps(
    unconfirmed.map((item) => item.step),
    { maps: tr.mapping.maps.slice(unconfirmed.length), mirrors: new Map() },
    (moved) => tr.maybeStep(moved).ok,
    {
      written: (index) => tr.docs[unconfirmed.length - index] ?? tr.before,
      current: () => tr.doc,
    },
  );

  return {
    unconfirmed: steps.map((step, index) => ({
      step,
      inverted: invertStep(step, tr.docs[first + index] ?? tr.before),
    })),
    chain: { ...chain, edges: new Set(chain.mirrors.keys()) },
    conflicts,
  };
};

export const collab = (options: CollabOptions = {}): Plugin<CollabState> => {
  const plugin = definePlugin<CollabState>({
    name: 'collab',
    state: {
      init: () => ({
        version: options.version ?? 0,
        unconfirmed: options.unconfirmed ?? [],
        trail: [],
      }),
      apply: applyCollab,
    },
  });

  registry.set(plugin, plugin);
  return plugin;
};

export const conflictsIn = (tr: Transaction): readonly AttrConflict[] =>
  collabConflicts.read(tr) ?? [];

export const collabVersion = (state: EditorState): number => collabStateOf(state).version;

export const collabVersionAfter = (tr: Transaction, before: EditorState): number | undefined =>
  collabUpdate.read(tr)?.version ?? collabStateIn(before)?.version;

export const collabProgress = (state: EditorState): CollabProgress | undefined => {
  const live = collabStateIn(state);

  return live === undefined
    ? undefined
    : { version: live.version, pending: live.unconfirmed.length };
};

export const positionsSince = (state: EditorState, version: number): Mappable | undefined => {
  const live = collabStateIn(state);
  const behind = live === undefined ? -1 : live.version - version;

  return live === undefined || behind < 0 || behind > live.trail.length
    ? undefined
    : createMapping([...live.trail.slice(live.trail.length - behind), ...mapsOf(live.unconfirmed)]);
};

export const sendableSteps = (state: EditorState): readonly Step[] =>
  collabStateOf(state).unconfirmed.map((item) => item.step);

export const receiveSteps = (
  state: EditorState,
  steps: readonly Step[],
): Transaction | undefined => {
  const { version, unconfirmed, trail } = collabStateOf(state);
  const tr = state.tr.setStoredMarks(state.storedMarks).setMeta(remoteChange, true);
  const next = version + steps.length;

  if (unconfirmed.length === 0) {
    return taken(tr, steps)
      ? tr.setMeta(collabUpdate, {
          version: next,
          unconfirmed,
          trail: grown(trail, tr.mapping.maps),
        })
      : undefined;
  }

  const rebased = rebaseLocal(tr, steps, unconfirmed);

  return rebased === undefined
    ? undefined
    : tr
        .setSelection(mapSelection(state.selection, mirrored(rebased.chain), state.doc, tr.doc))
        .setMeta(remoteChain, rebased.chain)
        .setMeta(collabConflicts, rebased.conflicts)
        .setMeta(collabUpdate, {
          version: next,
          unconfirmed: rebased.unconfirmed,
          trail: grown(
            trail,
            tr.mapping.maps.slice(unconfirmed.length, unconfirmed.length + steps.length),
          ),
        });
};

const sameSteps = (left: readonly Step[], right: readonly Step[]): boolean =>
  left.length === right.length &&
  left.every(
    (step, index) =>
      JSON.stringify(stepToJSON(step)) === JSON.stringify(stepToJSON(right[index] ?? step)),
  );

export const settleSteps = (
  state: EditorState,
  count: number,
  steps: readonly Step[],
  version: number,
): Transaction | undefined => {
  const { unconfirmed, trail } = collabStateOf(state);
  const sent = unconfirmed.slice(0, count);
  const later = unconfirmed.slice(count);

  if (
    sameSteps(
      sent.map((item) => item.step),
      steps,
    )
  ) {
    return state.tr.setMeta(collabUpdate, {
      version,
      unconfirmed: later,
      trail: grown(trail, mapsOf(sent)),
    });
  }

  const tr = state.tr.setStoredMarks(state.storedMarks).setMeta(remoteChange, true);
  const replaced = [...sent.toReversed().map((item) => item.inverted), ...steps];
  const rebased = rebaseLocal(tr, replaced, later);
  const written = later.length + sent.length;

  return rebased === undefined
    ? undefined
    : tr
        .setSelection(mapSelection(state.selection, mirrored(rebased.chain), state.doc, tr.doc))
        .setMeta(remoteChain, rebased.chain)
        .setMeta(collabUpdate, {
          version,
          unconfirmed: rebased.unconfirmed,
          trail: grown(trail, tr.mapping.maps.slice(written, written + steps.length)),
        });
};

export const confirmSteps = (state: EditorState, count: number, version: number): Transaction => {
  const { unconfirmed, trail } = collabStateOf(state);

  return state.tr.setMeta(collabUpdate, {
    version,
    unconfirmed: unconfirmed.slice(count),
    trail: grown(trail, mapsOf(unconfirmed.slice(0, count))),
  });
};
