import type { AnyEntry } from './registry';

export interface PendingTracker {
  hold(entry: AnyEntry): void;
  release(entry: AnyEntry): void;
}

export const createPendingTracker = (): PendingTracker => {
  const counts = new Map<AnyEntry, number>();

  const shift = (entry: AnyEntry, delta: number): void => {
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
