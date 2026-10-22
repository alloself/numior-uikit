import { inputSource } from '../commands/input';
import type { InputSource } from '../state/input.types';
import { createMetaKey, definePlugin } from '../state/plugin';
import type { Selection } from '../state/selection.types';
import type { Command, EditorState, Plugin, Transaction } from '../state/state.types';
import type { StepMap } from '../transform/mapping.types';
import { invertStep, mapStep, stepMapOf } from '../transform/step';
import type { Step } from '../transform/step.types';
import type { HistoryAction, HistoryEvent, HistoryOptions, HistoryState } from './history.types';
import { mirrored, passedStep, type MirrorMaps } from './rebase';

interface HistorySettings {
  readonly depth: number;
  readonly groupDelay: number;
}

interface Rebased {
  readonly steps: readonly Step[];
  readonly chain: MirrorMaps;
}

const GROUPED: ReadonlySet<InputSource> = new Set(['type', 'delete', 'compose']);

const historyAction = createMetaKey<HistoryAction>('historyAction');

export const addToHistory = createMetaKey<boolean>('addToHistory');

export const closeHistory = createMetaKey<boolean>('closeHistory');

export const remoteChange = createMetaKey<boolean>('remote');

const registry = new WeakMap<object, Plugin<HistoryState>>();

const EMPTY: HistoryState = { done: [], undone: [], time: 0, source: undefined, open: false };

const invertAll = (tr: Transaction): readonly Step[] =>
  tr.steps.map((step, index) => invertStep(step, tr.docs[index] ?? tr.before)).toReversed();

const eventOf = (tr: Transaction, before: EditorState): HistoryEvent => ({
  steps: invertAll(tr),
  selection: before.selection,
});

const idle = (step: Step): boolean => {
  switch (step.kind) {
    case 'replace':
      return step.from === step.to && step.slice.content.length === 0;
    case 'addMark':
    case 'removeMark':
      return step.from >= step.to;
    default:
      return false;
  }
};

const movedStep = (step: Step, chain: MirrorMaps): Step | undefined => {
  const moved = mapStep(step, mirrored(chain));

  return moved === undefined || idle(moved) ? undefined : moved;
};

const rebaseSteps = (steps: readonly Step[], chain: MirrorMaps): Rebased =>
  steps.reduce<Rebased>(
    (done, step) => {
      const moved = movedStep(step, done.chain);
      const back = stepMapOf(step).invert();

      return moved === undefined
        ? { steps: done.steps, chain: passedStep(done.chain, back) }
        : {
            steps: [...done.steps, moved],
            chain: passedStep(done.chain, back, stepMapOf(moved)),
          };
    },
    { steps: [], chain },
  );

const movedSelection = (selection: Selection, chain: MirrorMaps): Selection => {
  const mapping = mirrored(chain);

  return selection.kind === 'text'
    ? { kind: 'text', anchor: mapping.map(selection.anchor), head: mapping.map(selection.head) }
    : selection;
};

const rebaseEvents = (
  events: readonly HistoryEvent[],
  maps: readonly StepMap[],
): readonly HistoryEvent[] => {
  let chain: MirrorMaps = { maps, mirrors: new Map() };
  const kept: HistoryEvent[] = [];

  for (const event of events.toReversed()) {
    const rebased = rebaseSteps(event.steps, chain);

    chain = rebased.chain;
    if (rebased.steps.length > 0) {
      kept.push({ steps: rebased.steps, selection: movedSelection(event.selection, chain) });
    }
  }
  return kept.toReversed();
};

const travelled = (
  value: HistoryState,
  action: HistoryAction,
  tr: Transaction,
  before: EditorState,
): HistoryState => {
  const event = eventOf(tr, before);

  return action === 'undo'
    ? { ...value, done: value.done.slice(0, -1), undone: [...value.undone, event], open: false }
    : { ...value, undone: value.undone.slice(0, -1), done: [...value.done, event], open: false };
};

const joins = (
  value: HistoryState,
  tr: Transaction,
  source: InputSource | undefined,
  delay: number,
): boolean =>
  value.open &&
  source !== undefined &&
  GROUPED.has(source) &&
  source === value.source &&
  tr.time - value.time < delay &&
  closeHistory.read(tr) !== true;

const recorded = (
  value: HistoryState,
  tr: Transaction,
  before: EditorState,
  options: HistorySettings,
): HistoryState => {
  const event = eventOf(tr, before);
  const source = inputSource.read(tr);
  const last = value.done.at(-1);

  const done =
    last !== undefined && joins(value, tr, source, options.groupDelay)
      ? [
          ...value.done.slice(0, -1),
          { steps: [...event.steps, ...last.steps], selection: last.selection },
        ]
      : [...value.done, event].slice(-options.depth);

  return { done, undone: [], time: tr.time, source, open: closeHistory.read(tr) !== true };
};

const applyHistory = (
  tr: Transaction,
  value: HistoryState,
  before: EditorState,
  options: HistorySettings,
): HistoryState => {
  const action = historyAction.read(tr);

  if (action !== undefined) {
    return travelled(value, action, tr, before);
  }
  if (!tr.changed) {
    return tr.selectionSet ? { ...value, open: false } : value;
  }
  if (addToHistory.read(tr) === false || remoteChange.read(tr) === true) {
    return {
      ...value,
      done: rebaseEvents(value.done, tr.mapping.maps),
      undone: rebaseEvents(value.undone, tr.mapping.maps),
      open: false,
    };
  }
  return recorded(value, tr, before, options);
};

const historyOf = (state: EditorState): HistoryState | undefined => {
  for (const plugin of state.plugins) {
    const found = registry.get(plugin);

    if (found !== undefined) {
      return found.getState(state);
    }
  }
  return undefined;
};

const travel =
  (action: HistoryAction): Command =>
  (state, dispatch) => {
    const history = historyOf(state);
    const event = (action === 'undo' ? history?.done : history?.undone)?.at(-1);

    if (event === undefined) {
      return false;
    }
    if (dispatch !== undefined) {
      const tr = state.tr;

      for (const step of event.steps) {
        tr.maybeStep(step);
      }
      dispatch(tr.setSelection(event.selection).setMeta(historyAction, action));
    }
    return true;
  };

export const undo: Command = travel('undo');

export const redo: Command = travel('redo');

export const undoDepth = (state: EditorState): number => historyOf(state)?.done.length ?? 0;

export const redoDepth = (state: EditorState): number => historyOf(state)?.undone.length ?? 0;

export const history = (options: HistoryOptions = {}): Plugin<HistoryState> => {
  const settled: HistorySettings = {
    depth: options.depth ?? 100,
    groupDelay: options.groupDelay ?? 500,
  };

  const plugin = definePlugin<HistoryState>({
    name: 'history',
    state: {
      init: () => EMPTY,
      apply: (tr, value, before) => applyHistory(tr, value, before, settled),
    },
    props: {
      handleIntent: (intent, state, dispatch) =>
        intent.kind === 'history' && travel(intent.action)(state, dispatch),
    },
  });

  registry.set(plugin, plugin);
  return plugin;
};
