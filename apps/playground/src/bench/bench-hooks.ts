export interface BenchHooks {
  readonly rows: number;
  readonly dataMs: number;
  firstRowMs: number | null;
  readonly latencies: number[];
  readonly settles: number[];
  readonly frames: number[];
  remount(): Promise<number>;
  recordFrames(active: boolean): void;
}

declare global {
  interface Window {
    numiorBench?: BenchHooks;
  }
}

export const afterPaint = (): Promise<number> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      const channel = new MessageChannel();

      channel.port1.addEventListener('message', () => {
        channel.port1.close();
        resolve(performance.now());
      });

      channel.port1.start();
      channel.port2.postMessage(undefined);
    });
  });

export interface InputClock {
  last: number;
}

export const trackInput = (clock: InputClock): void => {
  for (const type of ['pointerdown', 'keydown'] as const) {
    window.addEventListener(
      type,
      (event) => {
        clock.last = event.timeStamp;
      },
      { capture: true },
    );
  }
};

export const recordSettle = async (settles: number[], clock: InputClock): Promise<void> => {
  settles.push((await afterPaint()) - clock.last);
};

const recordLatency = async (latencies: number[], started: number): Promise<void> => {
  latencies.push((await afterPaint()) - started);
};

export const trackKeyLatency = (latencies: number[]): void => {
  window.addEventListener(
    'keydown',
    (event) => {
      void recordLatency(latencies, event.timeStamp);
    },
    { capture: true },
  );
};

export const createFrameRecorder = (frames: number[]): ((active: boolean) => void) => {
  let running = false;
  let previous = 0;

  const tick = (now: number): void => {
    if (!running) {
      return;
    }
    if (previous > 0) {
      frames.push(now - previous);
    }
    previous = now;
    requestAnimationFrame(tick);
  };

  return (active) => {
    if (active && !running) {
      running = true;
      previous = 0;
      frames.length = 0;
      requestAnimationFrame(tick);
    }
    if (!active) {
      running = false;
    }
  };
};
