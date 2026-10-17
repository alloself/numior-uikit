const crossing = (target: Element, isIntersecting: boolean): IntersectionObserverEntry => ({
  target,
  isIntersecting,
  time: 0,
  intersectionRatio: isIntersecting ? 1 : 0,
  boundingClientRect: new DOMRect(),
  intersectionRect: new DOMRect(),
  rootBounds: null,
});

export class FakeIntersections {
  private readonly observers: FakeObserver[] = [];
  private readonly original = globalThis.IntersectionObserver;

  install(): void {
    const observers = this.observers;

    globalThis.IntersectionObserver = class extends FakeObserver {
      constructor(callback: IntersectionObserverCallback) {
        super(callback);
        observers.push(this);
      }
    };
  }

  restore(): void {
    globalThis.IntersectionObserver = this.original;
  }

  watches(target: Element): boolean {
    return this.observers.some((observer) => observer.watched.has(target));
  }

  cross(target: Element, isIntersecting = true): void {
    for (const observer of this.observers) {
      observer.report([crossing(target, isIntersecting)]);
    }
  }
}

class FakeObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly scrollMargin = '';
  readonly thresholds: readonly number[] = [];
  readonly watched = new Set<Element>();

  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(target: Element): void {
    this.watched.add(target);
  }

  unobserve(target: Element): void {
    this.watched.delete(target);
  }

  disconnect(): void {
    this.watched.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  report(records: IntersectionObserverEntry[]): void {
    this.callback(
      records.filter((record) => this.watched.has(record.target)),
      this,
    );
  }
}
