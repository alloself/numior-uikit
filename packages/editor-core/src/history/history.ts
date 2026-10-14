import { inputSource } from '../commands/input';
import type { InputSource } from '../state/input.types';
import { createMetaKey, definePlugin } from '../state/plugin';
import { mapSelection } from '../state/selection';
import type { Command, EditorState, Plugin, Transaction } from '../state/state.types';
import { invertStep, mapStep } from '../transform/step';
import type { Step } from '../transform/step.types';
import type { HistoryAction, HistoryEvent, HistoryOptions, HistoryState } from './history.types';

interface HistorySettings {
  readonly depth: number;
  readonly groupDelay: number;
}

const GROUPED: ReadonlySet<InputSource> = new Set(['type', 'delete', 'compose']);

const historyAction = createMetaKey<HistoryAction>('historyAction');

export const addToHistory = createMetaKey<boolean>('addToHistory');

export const closeHistory = createMetaKey<boolean>('closeHistory');

const registry = new WeakMap<object, Plugin<HistoryState>>();

const EMPTY: HistoryState = { done: [], undone: [], time: 0, source: undefined, open: false };

const invertAll = (tr: Transaction): readonly Step[] =>
  tr.steps.map((step, index) => invertStep(step, tr.docs[index] ?? tr.before)).toReversed();

const eventOf = (tr: Transaction, before: EditorState): HistoryEvent => ({
  steps: invertAll(tr),
  selection: before.selection,
});

const mapEvents = (
  events: readonly HistoryEvent[],
  tr: Transaction,
  before: EditorState,
): readonly HistoryEvent[] =>
  events.flatMap((event) => {
    const steps = event.steps.flatMap((step) => {
      const mapped = mapStep(step, tr.mapping);

      return mapped === undefined ? [] : [mapped];
    });

    return steps.length === 0
      ? []
      : [{ steps, selection: mapSelection(event.selection, tr.mapping, before.doc, tr.doc) }];
  });

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
  if (addToHistory.read(tr) === false) {
    return {
      ...value,
      done: mapEvents(value.done, tr, before),
      undone: mapEvents(value.undone, tr, before),
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
