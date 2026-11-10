import { vi } from 'vite-plus/test';
import { useEdgeScroll, type EdgeScroll } from '../../src';
import { captureSetup, type Capture } from './capture';

export interface EdgeScrollHarnessOptions {
  readonly size?: number;
}

export interface EdgeDragOptions {
  readonly frames: number;
  readonly movesPerFrame: number;
}

interface FrameQueue {
  now: number;
  issued: number;
  readonly pending: Map<number, FrameRequestCallback>;
}

const FRAME = 1000 / 60;

const installFrames = (): FrameQueue => {
  const queue: FrameQueue = { now: 1000, issued: 0, pending: new Map() };

  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
    queue.issued += 1;
    queue.pending.set(queue.issued, callback);
    return queue.issued;
  });

  vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
    queue.pending.delete(id);
  });

  return queue;
};

const defineRect = (element: HTMLElement, size: number): void => {
  const rect = { top: 0, bottom: size, left: 0, right: size, width: size, height: size };

  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({ ...rect, x: 0, y: 0, toJSON: () => ({}) }),
    configurable: true,
  });
};

export class EdgeScrollHarness {
  static mount({ size = 200 }: EdgeScrollHarnessOptions = {}): EdgeScrollHarness {
    const queue = installFrames();
    const container = document.createElement('div');
    const steps = { count: 0 };

    defineRect(container, size);

    const capture = captureSetup(() =>
      useEdgeScroll({
        container,
        onStep: () => {
          steps.count += 1;
        },
      }),
    );

    return new EdgeScrollHarness(capture, container, queue, steps);
  }

  private constructor(
    private readonly capture: Capture<EdgeScroll>,
    private readonly container: HTMLElement,
    private readonly queue: FrameQueue,
    private readonly counted: { count: number },
  ) {}

  get scrollTop(): number {
    return this.container.scrollTop;
  }

  get scrollLeft(): number {
    return this.container.scrollLeft;
  }

  get steps(): number {
    return this.counted.count;
  }

  get awaitsFrame(): boolean {
    return this.queue.pending.size > 0;
  }

  moveTo(y: number): void {
    this.capture.value.follow({ y });
  }

  moveAcross(x: number): void {
    this.capture.value.follow({ x });
  }

  frame(elapsed = FRAME): void {
    const due = [...this.queue.pending.values()];

    this.queue.pending.clear();
    this.queue.now += elapsed;

    for (const callback of due) {
      callback(this.queue.now);
    }
  }

  drag(y: number, { frames, movesPerFrame }: EdgeDragOptions): void {
    this.moveTo(y);

    for (let frame = 0; frame < frames; frame += 1) {
      for (let move = 0; move < movesPerFrame; move += 1) {
        this.moveTo(y);
      }

      this.frame();
    }
  }

  stop(): void {
    this.capture.value.stop();
  }

  unmount(): void {
    this.capture.wrapper.unmount();
    vi.unstubAllGlobals();
  }
}
