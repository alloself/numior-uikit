import type { Entry } from './registry';

export interface PendingTracker {
  hold(entry: Entry): void;
  release(entry: Entry): void;
}

export const createPendingTracker = (): PendingTracker => {
  const counts = new Map<Entry, number>();

  const shift = (entry: Entry, delta: number): void => {
    const count = (counts.get(entry) ?? 0) + delta;

    if (count > 0) {
      counts.set(entry, count);
    } else {
      counts.delete(entry);
    }
    entry.state.setPending(count > 0);
  };

  return {
    hold: (entry) => {
      shift(entry, 1);
    },
    release: (entry) => {
      shift(entry, -1);
    },
  };
};
