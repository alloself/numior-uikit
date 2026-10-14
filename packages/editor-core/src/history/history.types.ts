import type { InputSource } from '../state/input.types';
import type { Selection } from '../state/selection.types';
import type { Step } from '../transform/step.types';

export type HistoryAction = 'undo' | 'redo';

export interface HistoryOptions {
  readonly depth?: number | undefined;
  readonly groupDelay?: number | undefined;
}

export interface HistoryEvent {
  readonly steps: readonly Step[];
  readonly selection: Selection;
}

export interface HistoryState {
  readonly done: readonly HistoryEvent[];
  readonly undone: readonly HistoryEvent[];
  readonly time: number;
  readonly source: InputSource | undefined;
  readonly open: boolean;
}
