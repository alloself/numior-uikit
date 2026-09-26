export interface Tracker {
  track<T>(work: Promise<T>): Promise<T>;
  settled(): Promise<void>;
}

export const createTracker = (): Tracker => {
  const waiters: Array<() => void> = [];
  let inflight = 0;

  const release = (): void => {
    inflight -= 1;

    if (inflight === 0) {
      for (const resolve of waiters.splice(0)) {
        resolve();
      }
    }
  };

  return {
    track: (work) => {
      inflight += 1;
      return work.finally(release);
    },
    settled: () =>
      inflight === 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            waiters.push(resolve);
          }),
  };
};
