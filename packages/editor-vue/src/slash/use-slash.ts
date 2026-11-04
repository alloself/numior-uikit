import {
  createSuggestion,
  deleteRange,
  sequence,
  type Command,
  type EditorState,
  type KeyInput,
  type Plugin,
  type SuggestionMatch,
  type SuggestionState,
} from '@numior/editor-core';
import { computed, ref, type ComputedRef } from 'vue';
import { filterSlash, type SlashItem } from './slash-items';
import { SlashItemKind } from '../suggest/suggest.types';
import { Key } from '@numior/primitives';

export interface SlashOptions {
  readonly state: () => EditorState;
  readonly enabled: () => boolean;
  readonly run: (command: Command) => boolean;
  readonly items: () => readonly SlashItem[];
}

export interface Slash {
  readonly plugin: Plugin<SuggestionState>;
  readonly open: ComputedRef<boolean>;
  readonly items: ComputedRef<readonly SlashItem[]>;
  readonly active: ComputedRef<number>;
  readonly hover: (index: number) => void;
  readonly choose: (item: SlashItem) => void;
}

const MOVES: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 };

export const useSlash = (options: SlashOptions): Slash => {
  const pointer = ref({ query: '', index: 0 });

  const all = computed(() => options.items());

  const onKey = (key: KeyInput, match: SuggestionMatch): boolean => keyed(key, match);

  const suggestion = createSuggestion({ name: 'slash', char: '/', onKey });
  const match = computed(() => (options.enabled() ? suggestion.match(options.state()) : undefined));

  const items = computed(() =>
    match.value === undefined ? [] : filterSlash(all.value, match.value.query),
  );

  const open = computed(() => items.value.length > 0);

  const active = computed(() =>
    pointer.value.query === match.value?.query
      ? Math.min(pointer.value.index, items.value.length - 1)
      : 0,
  );

  const point = (index: number): void => {
    pointer.value = { query: match.value?.query ?? '', index };
  };

  const apply = (item: SlashItem, found: SuggestionMatch): void => {
    const query = deleteRange({ from: found.from, to: found.to });

    switch (item.kind) {
      case SlashItemKind.Command:
        options.run(sequence(query, item.command));
        break;
      case SlashItemKind.Open:
        options.run(query);
        item.open();
        break;
    }
  };

  const keyed = (key: KeyInput, found: SuggestionMatch): boolean => {
    const list = items.value;
    const move = MOVES[key.key];
    const chosen = list[active.value];

    if (list.length === 0 || key.ctrl || key.meta || key.alt) {
      return false;
    }
    if (move !== undefined) {
      point((active.value + move + list.length) % list.length);
      return true;
    }
    if ((key.key === Key.Enter || key.key === Key.Tab) && chosen !== undefined) {
      apply(chosen, found);
      return true;
    }
    return key.key === Key.Escape && options.run(suggestion.dismiss);
  };

  return {
    plugin: suggestion.plugin,
    open,
    items,
    active,
    hover: point,
    choose: (item) => {
      const found = match.value;

      if (found !== undefined) {
        apply(item, found);
      }
    },
  };
};
