import { OfflineCopy } from '../store/store.types';

export type WriteJob = () => Promise<void>;

export interface WriteQueue {
  readonly add: (job: WriteJob) => void;
  readonly drained: () => Promise<void>;
}

interface WriteQueueOptions {
  readonly onError: ((error: unknown) => void) | undefined;
  readonly onState: (state: OfflineCopy) => void;
}

const FIRST_RETRY = 1000;

const LAST_RETRY = 30_000;

const retryDelay = (failures: number): number =>
  Math.min(LAST_RETRY, FIRST_RETRY * 2 ** (failures - 1));

export const createWriteQueue = ({ onError, onState }: WriteQueueOptions): WriteQueue => {
  let tail: Promise<void> = Promise.resolve();
  let closing = false;
  let failing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let wake: (() => void) | undefined;

  const rested = (delay: number): Promise<void> =>
    new Promise((resolve) => {
      wake = resolve;
      timer = setTimeout(resolve, delay);
    });

  const note = (failed: boolean): void => {
    if (failing === failed) {
      return;
    }

    failing = failed;
    onState(failed ? OfflineCopy.Failing : OfflineCopy.Kept);
  };

  const attempt = async (job: WriteJob, failures: number): Promise<void> => {
    try {
      await job();
    } catch (error) {
      onError?.(error);
      note(true);

      if (closing) {
        return;
      }

      await rested(retryDelay(failures + 1));
      await attempt(job, failures + 1);
      return;
    }

    note(false);
  };

  const run = async (previous: Promise<void>, job: WriteJob): Promise<void> => {
    await previous;
    await attempt(job, 0);
  };

  return {
    add: (job) => {
      tail = run(tail, job);
    },
    drained: async () => {
      closing = true;
      clearTimeout(timer);
      wake?.();
      await tail;
      closing = false;
    },
  };
};
