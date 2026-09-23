export interface Timers {
  start(id: string, ms: number, onDone: () => void): void;
  pause(id: string): void;
  resume(id: string): void;
  clear(id: string): void;
  has(id: string): boolean;
}

interface Entry {
  handle: ReturnType<typeof setTimeout> | undefined;
  remaining: number;
  startedAt: number;
  readonly onDone: () => void;
}

export const createTimers = (): Timers => {
  const entries = new Map<string, Entry>();
  const arm = (id: string, entry: Entry): void => {
    entry.startedAt = Date.now();
    entry.handle = setTimeout(() => {
      entries.delete(id);
      entry.onDone();
    }, entry.remaining);
  };
  const clear = (id: string): void => {
    const entry = entries.get(id);
    if (!entry) {
      return;
    }
    if (entry.handle !== undefined) {
      clearTimeout(entry.handle);
    }
    entries.delete(id);
  };
  return {
    start: (id, ms, onDone) => {
      clear(id);
      const entry: Entry = { handle: undefined, remaining: ms, startedAt: 0, onDone };
      entries.set(id, entry);
      arm(id, entry);
    },
    pause: (id) => {
      const entry = entries.get(id);
      if (!entry || entry.handle === undefined) {
        return;
      }
      clearTimeout(entry.handle);
      entry.handle = undefined;
      entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.startedAt));
    },
    resume: (id) => {
      const entry = entries.get(id);
      if (!entry || entry.handle !== undefined) {
        return;
      }
      arm(id, entry);
    },
    clear,
    has: (id) => entries.has(id),
  };
};
