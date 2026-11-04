import { inlineText, intentCommand } from '../commands/input';
import type { Doc } from '../doc/doc.types';
import { closeHistory } from '../history/history';
import { TextDirection, type InputIntent } from '../state/input.types';
import { createMetaKey, definePlugin } from '../state/plugin';
import { isCursor } from '../state/selection';
import {
  InputIntentKind,
  SelectionKind,
  type Dispatch,
  type EditorState,
  type Plugin,
  type Transaction,
} from '../state/state.types';
import { invertStep } from '../transform/step';
import type { Step } from '../transform/step.types';
import type { InputRule, InputRuleMatch } from './input-rules.types';

interface Undoable {
  readonly doc: Doc;
  readonly steps: readonly Step[];
}

const fired = createMetaKey<Undoable>('inputRule');

const SCAN = 500;

const typed = (state: EditorState, intent: InputIntent): Transaction | undefined => {
  if (intent.kind !== InputIntentKind.InsertText && intent.kind !== InputIntentKind.Compose) {
    return undefined;
  }
  let tr: Transaction | undefined;

  intentCommand(intent)(state, (next) => {
    tr = next;
  });

  return tr;
};

const matchAt = (tr: Transaction): InputRuleMatch | undefined => {
  const selection = tr.selection;

  if (selection.kind !== SelectionKind.Text || !isCursor(selection)) {
    return undefined;
  }
  const $pos = tr.doc.resolve(selection.head);
  const type = tr.doc.schema.nodes.get($pos.parent.type);

  if (type?.inlineContent !== true || type.code) {
    return undefined;
  }
  const start = $pos.start($pos.depth);
  const offset = $pos.parentOffset;
  const from = Math.max(0, offset - SCAN);

  return { text: inlineText($pos.parent).slice(from, offset), start: start + from, end: $pos.pos };
};

const applyRules = (rules: readonly InputRule[], tr: Transaction): boolean => {
  const spot = matchAt(tr);

  if (spot === undefined) {
    return false;
  }
  for (const rule of rules) {
    const match = rule.match.exec(spot.text);

    if (match !== null && rule.apply(tr, match, spot.end - match[0].length, spot.end)) {
      return true;
    }
  }
  return false;
};

const ruleSteps = (tr: Transaction, from: number): readonly Step[] =>
  tr.steps
    .slice(from)
    .map((step, index) => invertStep(step, tr.docs[from + index] ?? tr.before))
    .toReversed();

const undoRule = (state: EditorState, undoable: Undoable, dispatch: Dispatch): boolean => {
  const tr = state.tr;

  for (const step of undoable.steps) {
    tr.maybeStep(step);
  }
  dispatch(tr.setMeta(closeHistory, true));
  return true;
};

export const inputRules = (rules: readonly InputRule[]): Plugin<Undoable | null> => {
  const plugin: Plugin<Undoable | null> = definePlugin<Undoable | null>({
    name: 'inputRules',
    state: {
      init: () => null,
      apply: (tr) => fired.read(tr) ?? null,
    },
    props: {
      handleIntent: (intent, state, dispatch) => {
        const undoable = plugin.getState(state) ?? null;

        if (
          intent.kind === InputIntentKind.Delete &&
          intent.direction === TextDirection.Backward &&
          undoable !== null &&
          undoable.doc === state.doc
        ) {
          return undoRule(state, undoable, dispatch);
        }
        const tr = typed(state, intent);
        const before = tr?.steps.length ?? 0;

        if (tr === undefined || !applyRules(rules, tr)) {
          return false;
        }

        dispatch(
          tr
            .setMeta(fired, { doc: tr.doc, steps: ruleSteps(tr, before) })
            .setMeta(closeHistory, true),
        );

        return true;
      },
    },
  });

  return plugin;
};
