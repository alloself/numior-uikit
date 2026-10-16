import {
  createSuggestion,
  deleteRange,
  sequence,
  type Command,
  type EditorState,
  type KeyInput,
  type Plugin,
  type Schema,
  type SuggestionMatch,
  type SuggestionState,
} from '@numior/editor-core';
import { useMessages } from '@numior/primitives';
import { computed, ref, type ComputedRef } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import type { NuiEditorBlock } from '../blocks/block.types';
import { filterSlash, slashItems, type SlashItem } from './slash-items';

export interface SlashOptions {
  readonly schema: Schema;
  readonly state: () => EditorState;
  readonly enabled: () => boolean;
  readonly run: (command: Command) => boolean;
  readonly blocks: readonly NuiEditorBlock[];
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
  const texts = useMessages(editorMessages);
  const pointer = ref({ query: '', index: 0 });

  const all = computed(() => [
    ...slashItems(options.schema, texts.value),
    ...options.blocks.flatMap((block) =>
      options.schema.nodes.has(block.name) ? (block.slash?.(texts.value) ?? []) : [],
    ),
  ]);

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
    options.run(sequence(deleteRange({ from: found.from, to: found.to }), item.command));
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
    if ((key.key === 'Enter' || key.key === 'Tab') && chosen !== undefined) {
      apply(chosen, found);
      return true;
    }
    return key.key === 'Escape' && options.run(suggestion.dismiss);
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
