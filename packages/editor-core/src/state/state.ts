import type { Doc } from '../doc/doc.types';
import { idSourceAfter } from '../model/node';
import type { IdSource, Mark } from '../model/node.types';
import { nearestCursor, validSelection } from './selection';
import type { Selection } from './selection.types';
import type {
  AppliedTransaction,
  EditorState,
  EditorStateConfig,
  Plugin,
  Transaction,
} from './state.types';
import { createTransaction } from './transaction';

interface StateFields {
  readonly doc: Doc;
  readonly selection: Selection;
  readonly storedMarks: readonly Mark[] | null;
  readonly plugins: readonly Plugin[];
  readonly ids: IdSource;
}

const APPEND_ROUNDS = 32;

const buildState = (fields: StateFields, before?: EditorState, tr?: Transaction): EditorState => {
  const state: EditorState = {
    doc: fields.doc,
    selection: fields.selection,
    storedMarks: fields.storedMarks,
    plugins: fields.plugins,
    ids: fields.ids,
    get tr() {
      return createTransaction(state, fields.ids);
    },
    apply: (transaction) => applyAll(state, fields.ids, transaction).state,
    applyTransaction: (transaction) => applyAll(state, fields.ids, transaction),
  };

  for (const plugin of fields.plugins) {
    plugin.attach(state, before, tr);
  }
  return state;
};

const applyOne = (state: EditorState, ids: IdSource, tr: Transaction): EditorState | undefined =>
  state.plugins.every((plugin) => plugin.filterTransaction(tr, state))
    ? buildState(
        {
          doc: tr.doc,
          selection: validSelection(tr.doc, tr.selection),
          storedMarks: tr.storedMarks,
          plugins: state.plugins,
          ids,
        },
        state,
        tr,
      )
    : undefined;

const appendRound = (
  start: EditorState,
  current: EditorState,
  ids: IdSource,
  transactions: Transaction[],
  seen: Map<Plugin, number>,
): EditorState | undefined => {
  let latest: EditorState | undefined;

  for (const plugin of start.plugins) {
    const unseen = transactions.slice(seen.get(plugin) ?? 0);
    const base = latest ?? current;

    seen.set(plugin, transactions.length);

    const extra = unseen.length === 0 ? undefined : plugin.appendTransaction(unseen, start, base);
    const next = extra === undefined ? undefined : applyOne(base, ids, extra);

    if (extra === undefined || next === undefined) {
      continue;
    }

    transactions.push(extra);
    latest = next;
  }
  return latest;
};

const applyAll = (state: EditorState, ids: IdSource, root: Transaction): AppliedTransaction => {
  const first = applyOne(state, ids, root);

  if (first === undefined) {
    return { state, transactions: [] };
  }
  const transactions = [root];
  const seen = new Map<Plugin, number>();
  let current = first;

  for (let round = 0; round < APPEND_ROUNDS; round += 1) {
    const next = appendRound(state, current, ids, transactions, seen);

    if (next === undefined) {
      break;
    }
    current = next;
  }
  return { state: current, transactions };
};

export const createState = (config: EditorStateConfig): EditorState =>
  buildState({
    doc: config.doc,
    selection: validSelection(config.doc, config.selection ?? nearestCursor(config.doc, 0)),
    storedMarks: config.storedMarks ?? null,
    plugins: config.plugins ?? [],
    ids: config.ids ?? idSourceAfter(config.doc.root),
  });
