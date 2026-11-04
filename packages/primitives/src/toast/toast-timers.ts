import { TimerState } from './toast.types';

export interface Timers {
  start(id: string, ms: number, onDone: () => void): void;
  pause(id: string): void;
  resume(id: string): void;
  clear(id: string): void;
  has(id: string): boolean;
}

type Entry =
  | {
      readonly state: typeof TimerState.Running;
      readonly handle: ReturnType<typeof setTimeout>;
      readonly startedAt: number;
      readonly remaining: number;
      readonly onDone: () => void;
    }
  | {
      readonly state: typeof TimerState.Paused;
      readonly remaining: number;
      readonly onDone: () => void;
    };

export const createTimers = (): Timers => {
  const entries = new Map<string, Entry>();

  const arm = (id: string, remaining: number, onDone: () => void): void => {
    const handle = setTimeout(() => {
      entries.delete(id);
      onDone();
    }, remaining);

    entries.set(id, {
      state: TimerState.Running,
      handle,
      startedAt: Date.now(),
      remaining,
      onDone,
    });
  };

  const clear = (id: string): void => {
    const entry = entries.get(id);

    if (entry?.state === TimerState.Running) {
      clearTimeout(entry.handle);
    }
    entries.delete(id);
  };

  return {
    start: (id, ms, onDone) => {
      clear(id);
      arm(id, ms, onDone);
    },
    pause: (id) => {
      const entry = entries.get(id);

      if (entry?.state !== TimerState.Running) {
        return;
      }
      clearTimeout(entry.handle);

      entries.set(id, {
        state: TimerState.Paused,
        remaining: Math.max(0, entry.remaining - (Date.now() - entry.startedAt)),
        onDone: entry.onDone,
      });
    },
    resume: (id) => {
      const entry = entries.get(id);

      if (entry?.state === TimerState.Paused) {
        arm(id, entry.remaining, entry.onDone);
      }
    },
    clear,
    has: (id) => entries.has(id),
  };
};
