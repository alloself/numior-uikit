import {
  createMetaKey,
  definePlugin,
  invertStep,
  mapSelection,
  mirrored,
  rebaseSteps,
  remoteChain,
  remoteChange,
  type EditorState,
  type MirrorMaps,
  type Plugin,
  type Step,
  type Transaction,
} from '@numior/editor-core';
import type { AttrConflict, CollabOptions, CollabState, UnconfirmedStep } from './collab.types';
import { attrConflicts } from './conflicts';

interface RebasedLocal {
  readonly unconfirmed: readonly UnconfirmedStep[];
  readonly chain: MirrorMaps;
  readonly conflicts: readonly AttrConflict[];
}

const NONE: CollabState = { version: 0, unconfirmed: [] };

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
  return tr.changed
    ? { version: value.version, unconfirmed: [...value.unconfirmed, ...localSteps(tr)] }
    : value;
};

const collabStateOf = (state: EditorState): CollabState => {
  for (const plugin of state.plugins) {
    const found = registry.get(plugin);

    if (found !== undefined) {
      return found.getState(state) ?? NONE;
    }
  }
  return NONE;
};

const rebaseLocal = (
  tr: Transaction,
  remote: readonly Step[],
  unconfirmed: readonly UnconfirmedStep[],
): RebasedLocal => {
  for (const item of unconfirmed.toReversed()) {
    tr.step(item.inverted);
  }
  for (const step of remote) {
    tr.step(step);
  }

  const conflicts = attrConflicts(tr.docs, remote, unconfirmed);
  const first = tr.steps.length;

  const { steps, chain } = rebaseSteps(
    unconfirmed.map((item) => item.step),
    { maps: tr.mapping.maps.slice(unconfirmed.length), mirrors: new Map() },
    (moved) => tr.maybeStep(moved).ok,
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
      init: () => ({ version: options.version ?? 0, unconfirmed: options.unconfirmed ?? [] }),
      apply: applyCollab,
    },
  });

  registry.set(plugin, plugin);
  return plugin;
};

export const conflictsIn = (tr: Transaction): readonly AttrConflict[] =>
  collabConflicts.read(tr) ?? [];

export const collabVersion = (state: EditorState): number => collabStateOf(state).version;

export const sendableSteps = (state: EditorState): readonly Step[] =>
  collabStateOf(state).unconfirmed.map((item) => item.step);

export const receiveSteps = (state: EditorState, steps: readonly Step[]): Transaction => {
  const { version, unconfirmed } = collabStateOf(state);
  const tr = state.tr.setStoredMarks(state.storedMarks).setMeta(remoteChange, true);
  const next = version + steps.length;

  if (unconfirmed.length === 0) {
    for (const step of steps) {
      tr.step(step);
    }
    return tr.setMeta(collabUpdate, { version: next, unconfirmed });
  }

  const rebased = rebaseLocal(tr, steps, unconfirmed);

  return tr
    .setSelection(mapSelection(state.selection, mirrored(rebased.chain), state.doc, tr.doc))
    .setMeta(remoteChain, rebased.chain)
    .setMeta(collabConflicts, rebased.conflicts)
    .setMeta(collabUpdate, { version: next, unconfirmed: rebased.unconfirmed });
};

export const confirmSteps = (state: EditorState, count: number, version: number): Transaction => {
  const { unconfirmed } = collabStateOf(state);

  return state.tr.setMeta(collabUpdate, { version, unconfirmed: unconfirmed.slice(count) });
};
