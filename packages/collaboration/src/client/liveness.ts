import type { CollabLiveness } from './client.types';

interface LivenessOptions {
  readonly settings: CollabLiveness | undefined;
  readonly ping: () => void;
  readonly lost: () => void;
}

export interface Liveness {
  readonly heard: () => void;
  readonly expect: () => void;
  readonly stop: () => void;
}

const INTERVAL = 15_000;

const TIMEOUT = 10_000;

export const createLiveness = ({ settings, ping, lost }: LivenessOptions): Liveness => {
  const interval = settings?.interval ?? INTERVAL;
  const timeout = settings?.timeout ?? TIMEOUT;
  let quiet: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;

  const stop = (): void => {
    clearTimeout(quiet);
    clearTimeout(deadline);
    quiet = undefined;
    deadline = undefined;
  };

  const expect = (): void => {
    deadline ??= setTimeout(() => {
      stop();
      lost();
    }, timeout);
  };

  const heard = (): void => {
    stop();

    if (interval > 0) {
      quiet = setTimeout(() => {
        ping();
        expect();
      }, interval);
    }
  };

  return { heard, expect, stop };
};
