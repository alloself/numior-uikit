import { vi } from 'vitest';

const owners = new Map<Element, ResizeObserverStub>();

class ResizeObserverStub implements ResizeObserver {
  constructor(private readonly notify: ResizeObserverCallback) {}

  observe(target: Element): void {
    owners.set(target, this);
  }

  unobserve(target: Element): void {
    owners.delete(target);
  }

  disconnect(): void {
    for (const [target, owner] of owners) {
      if (owner === this) {
        owners.delete(target);
      }
    }
  }

  report(entry: ResizeObserverEntry): void {
    this.notify([entry], this);
  }
}

export const installResizeObservers = (): void => {
  owners.clear();
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
};

export const observedTargets = (): number => owners.size;

export const resizeTarget = (target: Element, blockSize: number): void => {
  owners.get(target)?.report({
    target,
    contentRect: target.getBoundingClientRect(),
    borderBoxSize: [{ blockSize, inlineSize: 0 }],
    contentBoxSize: [{ blockSize, inlineSize: 0 }],
    devicePixelContentBoxSize: [],
  });
};
