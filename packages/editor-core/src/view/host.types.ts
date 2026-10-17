import type { InputSource } from '../state/input.types';
import type { EditorState, Transaction } from '../state/state.types';
import type { ElementDesc, ViewContext } from './desc';

export interface ViewHost {
  readonly root: HTMLElement;
  readonly context: ViewContext;
  readonly rootDesc: ElementDesc;
  readonly state: () => EditorState;
  readonly dispatch: (tr: Transaction, source?: InputSource) => void;
  readonly composing: () => boolean;
  readonly holding: () => boolean;
}
