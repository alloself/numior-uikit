import type { ReorderEvent, ReorderState } from '@numior/primitives';
import type { NuiTableAnnouncement } from './table.types';

export interface ReorderFeedback {
  readonly place: (from: number, to: number) => void;
  readonly clear: () => void;
  readonly float: (state: ReorderState) => void;
  readonly say: (phase: NuiTableAnnouncement['phase'], from: number, to: number) => void;
  readonly moved?: ((to: number) => void) | undefined;
}

export interface ReorderListeners {
  onChange(state: ReorderState): void;
  onEvent(event: ReorderEvent): void;
}

export const reorderListeners = (feedback: ReorderFeedback): ReorderListeners => ({
  onChange: (state) => {
    switch (state.phase) {
      case 'dragging':
      case 'keyboard':
        feedback.place(state.from, state.to);
        break;
      case 'idle':
        feedback.clear();
        break;
      case 'pending':
        break;
    }
    feedback.float(state);
  },
  onEvent: (event) => {
    switch (event.type) {
      case 'grabbed':
      case 'cancelled':
        feedback.say(event.type, event.from, event.from);
        break;
      case 'moved':
        feedback.say(event.type, event.from, event.to);
        feedback.moved?.(event.to);
        break;
      case 'dropped':
        feedback.say(event.type, event.from, event.to);
        break;
    }
  },
});
