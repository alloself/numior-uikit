import {
  createSuggestion,
  nodeSize,
  textSelection,
  type Command,
  type EditorState,
  type KeyInput,
  type Plugin,
  type SuggestionMatch,
  type SuggestionState,
} from '@numior/editor-core';
import { useMounted } from '@vueuse/core';
import { computed, onScopeDispose, ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue';
import type { NuiEditorMention, NuiEditorMentions } from './mentions.types';
import { Key } from '@numior/primitives';

export interface MentionOptions {
  readonly state: () => EditorState;
  readonly enabled: () => boolean;
  readonly run: (command: Command) => boolean;
  readonly search: () => NuiEditorMentions | undefined;
}

export interface Mentions {
  readonly plugin: Plugin<SuggestionState>;
  readonly open: ComputedRef<boolean>;
  readonly people: Readonly<Ref<readonly NuiEditorMention[]>>;
  readonly loading: Readonly<Ref<boolean>>;
  readonly failed: Readonly<Ref<boolean>>;
  readonly active: ComputedRef<number>;
  hover(index: number): void;
  choose(person: NuiEditorMention): void;
}

const DELAY_MS = 150;

const MOVES: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 };

const insertMention =
  (found: SuggestionMatch, person: NuiEditorMention): Command =>
  (state, dispatch) => {
    const { schema } = state.doc;

    if (!schema.nodes.has('mention')) {
      return false;
    }
    const tr = state.tr;

    const mention = schema.element('mention', {
      id: tr.newId(),
      attrs: { user: person.id, label: person.label },
    });

    tr.delete(found.from, found.to);
    tr.insert(found.from, [mention, schema.text(' ')]);
    tr.setSelection(textSelection(found.from + nodeSize(mention) + 1));
    dispatch?.(tr);
    return true;
  };

export const useMentions = (options: MentionOptions): Mentions => {
  const people = shallowRef<readonly NuiEditorMention[]>([]);
  const loading = ref(false);
  const failed = ref(false);
  const pointer = ref({ query: '', index: 0 });
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const onKey = (key: KeyInput, found: SuggestionMatch): boolean => keyed(key, found);

  const suggestion = createSuggestion({ name: 'mention', char: '@', onKey });

  const mounted = useMounted();

  const match = computed(() =>
    mounted.value && options.enabled() && options.search() !== undefined
      ? suggestion.match(options.state())
      : undefined,
  );

  const open = computed(() => match.value !== undefined);

  const active = computed(() =>
    pointer.value.query === match.value?.query
      ? Math.min(pointer.value.index, people.value.length - 1)
      : 0,
  );

  const point = (index: number): void => {
    pointer.value = { query: match.value?.query ?? '', index };
  };

  const cancel = (): void => {
    clearTimeout(timer);
    controller?.abort();
    controller = undefined;
  };

  const ask = (query: string): void => {
    const search = options.search();
    const current = new AbortController();

    if (search === undefined) {
      return;
    }
    controller = current;

    search(query, { signal: current.signal })
      .then((found) => {
        if (controller === current) {
          people.value = found;
          failed.value = false;
        }
        return found;
      })
      .catch(() => {
        if (controller !== current) {
          return;
        }

        people.value = [];
        failed.value = true;
      })
      .finally(() => {
        if (controller !== current) {
          return;
        }

        controller = undefined;
        loading.value = false;
      });
  };

  const insert = (person: NuiEditorMention, found: SuggestionMatch): void => {
    cancel();
    options.run(insertMention(found, person));
  };

  const keyed = (key: KeyInput, found: SuggestionMatch): boolean => {
    const list = people.value;
    const move = MOVES[key.key];
    const chosen = list[active.value];

    if (key.ctrl || key.meta || key.alt) {
      return false;
    }
    if (move !== undefined && list.length > 0) {
      point((active.value + move + list.length) % list.length);
      return true;
    }
    if ((key.key === Key.Enter || key.key === Key.Tab) && chosen !== undefined) {
      insert(chosen, found);
      return true;
    }
    return key.key === Key.Escape && options.run(suggestion.dismiss);
  };

  watch(
    () => match.value?.query,
    (query) => {
      cancel();
      if (query === undefined) {
        people.value = [];
        loading.value = false;
        failed.value = false;
        return;
      }
      loading.value = true;

      timer = setTimeout(() => {
        ask(query);
      }, DELAY_MS);
    },
  );

  onScopeDispose(cancel);

  return {
    plugin: suggestion.plugin,
    open,
    people,
    loading,
    failed,
    active,
    hover: point,
    choose: (person) => {
      const found = match.value;

      if (found !== undefined) {
        insert(person, found);
      }
    },
  };
};
