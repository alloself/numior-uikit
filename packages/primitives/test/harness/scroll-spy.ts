import { vi } from 'vitest';

export interface SpiedPosition {
  readonly id: string;
  readonly visible: boolean;
  readonly top: number;
}

export interface SpiedObserver {
  readonly rootMargin: string;
  readonly targets: readonly Element[];
  readonly disconnected: boolean;
  fire(positions: readonly SpiedPosition[]): void;
}

type EntriesCallback = (entries: IntersectionObserverEntry[]) => void;

const rectAt = (top: number): DOMRectReadOnly => ({
  x: 0,
  y: top,
  width: 0,
  height: 0,
  top,
  right: 0,
  bottom: top,
  left: 0,
  toJSON: () => ({}),
});

const entryFor = (target: Element, position: SpiedPosition): IntersectionObserverEntry => ({
  time: 0,
  target,
  isIntersecting: position.visible,
  intersectionRatio: position.visible ? 1 : 0,
  boundingClientRect: rectAt(position.top),
  intersectionRect: rectAt(position.top),
  rootBounds: rectAt(0),
});

const observerClass = (observers: SpiedObserver[]) =>
  class {
    readonly rootMargin: string;
    readonly targets: Element[] = [];
    disconnected = false;

    constructor(
      private readonly callback: EntriesCallback,
      options: IntersectionObserverInit = {},
    ) {
      this.rootMargin = options.rootMargin ?? '0px';
      observers.push(this);
    }

    observe(target: Element): void {
      this.targets.push(target);
    }

    disconnect(): void {
      this.targets.length = 0;
      this.disconnected = true;
    }

    fire(positions: readonly SpiedPosition[]): void {
      this.callback(
        positions.flatMap((position) => {
          const target = this.targets.find((element) => element.id === position.id);

          return target === undefined ? [] : [entryFor(target, position)];
        }),
      );
    }
  };

export const installIntersectionObserver = (): {
  readonly observers: readonly SpiedObserver[];
  last(): SpiedObserver | undefined;
} => {
  const observers: SpiedObserver[] = [];

  vi.stubGlobal('IntersectionObserver', observerClass(observers));
  return { observers, last: () => observers.at(-1) };
};
