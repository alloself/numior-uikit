const entryOf = (target: Element): ResizeObserverEntry => ({
  target,
  contentRect: target.getBoundingClientRect(),
  borderBoxSize: [],
  contentBoxSize: [],
  devicePixelContentBoxSize: [],
});

interface Watch {
  readonly notify: ResizeObserverCallback;
  readonly observer: ResizeObserver;
  readonly targets: Set<Element>;
}

export class ResizeObservers {
  private readonly watches = new Set<Watch>();

  constructor() {
    const watches = this.watches;

    class Observer implements ResizeObserver {
      private readonly watch: Watch;

      constructor(notify: ResizeObserverCallback) {
        this.watch = { notify, observer: this, targets: new Set() };
        watches.add(this.watch);
      }

      observe(target: Element): void {
        this.watch.targets.add(target);
      }

      unobserve(target: Element): void {
        this.watch.targets.delete(target);
      }

      disconnect(): void {
        this.watch.targets.clear();
      }
    }

    Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: Observer });
  }

  resize(target: Element): void {
    for (const watch of this.watches) {
      if (watch.targets.has(target)) {
        watch.notify([entryOf(target)], watch.observer);
      }
    }
  }

  restore(): void {
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  }
}
