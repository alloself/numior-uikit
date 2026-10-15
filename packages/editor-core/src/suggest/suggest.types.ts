import type { KeyInput } from '../state/input.types';
import type { Command, EditorState, Plugin } from '../state/state.types';

export interface SuggestionMatch {
  readonly from: number;
  readonly to: number;
  readonly query: string;
}

export interface SuggestionSpec {
  readonly name: string;
  readonly char: string;
  readonly allowSpaces?: boolean | undefined;
  readonly maxLength?: number | undefined;
  readonly onKey?: ((key: KeyInput, match: SuggestionMatch) => boolean) | undefined;
}

export interface SuggestionState {
  readonly dismissed: number | undefined;
}

export interface Suggestion {
  readonly plugin: Plugin<SuggestionState>;
  match(state: EditorState): SuggestionMatch | undefined;
  readonly dismiss: Command;
}
