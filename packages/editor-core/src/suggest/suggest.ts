import { inlineText } from '../commands/input';
import { createMetaKey, definePlugin } from '../state/plugin';
import { isCursor } from '../state/selection';
import { SelectionKind, type EditorState } from '../state/state.types';
import type { Suggestion, SuggestionMatch, SuggestionSpec, SuggestionState } from './suggest.types';

const SPACE = /\s/u;

const LINE = /\n/u;

const matchIn = (spec: SuggestionSpec, state: EditorState): SuggestionMatch | undefined => {
  const { selection, doc } = state;

  if (selection.kind !== SelectionKind.Text || !isCursor(selection)) {
    return undefined;
  }
  const cursor = doc.resolve(selection.head);
  const type = doc.schema.nodes.get(cursor.parent.type);

  if (type?.inlineContent !== true || type.code) {
    return undefined;
  }
  const before = inlineText(cursor.parent).slice(0, cursor.parentOffset);
  const at = before.lastIndexOf(spec.char);
  const query = before.slice(at + spec.char.length);
  const opens = at === 0 || SPACE.test(before.charAt(at - 1));

  if (
    at < 0 ||
    !opens ||
    LINE.test(query) ||
    query.length > (spec.maxLength ?? 32) ||
    (spec.allowSpaces !== true && SPACE.test(query))
  ) {
    return undefined;
  }
  return { from: selection.head - query.length - spec.char.length, to: selection.head, query };
};

export const createSuggestion = (spec: SuggestionSpec): Suggestion => {
  const dismissedAt = createMetaKey<number>(`${spec.name}-dismissed`);

  const plugin = definePlugin<SuggestionState>({
    name: spec.name,
    state: {
      init: () => ({ dismissed: undefined }),
      apply: (tr, value) => {
        const dismissed = dismissedAt.read(tr);

        if (dismissed !== undefined) {
          return { dismissed };
        }
        if (value.dismissed === undefined) {
          return value;
        }
        const mapped = tr.mapping.mapResult(value.dismissed, 1);

        return { dismissed: mapped.deleted ? undefined : mapped.pos };
      },
    },
    props: {
      handleKey: (key, state) => {
        const found = match(state);

        return found !== undefined && spec.onKey !== undefined && spec.onKey(key, found);
      },
    },
  });

  const match = (state: EditorState): SuggestionMatch | undefined => {
    const found = matchIn(spec, state);

    return found === undefined || plugin.getState(state)?.dismissed === found.from
      ? undefined
      : found;
  };

  return {
    plugin,
    match,
    dismiss: (state, dispatch) => {
      const found = match(state);

      if (found === undefined) {
        return false;
      }
      const tr = state.tr;

      dismissedAt.write(tr, found.from);
      dispatch?.(tr);
      return true;
    },
  };
};
