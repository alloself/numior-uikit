interface Watcher {
  readonly observer: ResizeObserver;
  readonly notify: ResizeObserverCallback;
  readonly watched: Set<Element>;
}

export interface RowObserverStub {
  deliver(targets: readonly Element[]): void;
  restore(): void;
}

const entryOf = (target: Element): ResizeObserverEntry => ({
  target,
  contentRect: target.getBoundingClientRect(),
  borderBoxSize: [],
  contentBoxSize: [],
  devicePixelContentBoxSize: [],
});

export const stubRowObserver = (): RowObserverStub => {
  const watchers: Watcher[] = [];

  const create = (notify: ResizeObserverCallback): ResizeObserver => {
    const watched = new Set<Element>();

    const observer: ResizeObserver = {
      observe: (target) => {
        watched.add(target);
      },
      unobserve: (target) => {
        watched.delete(target);
      },
      disconnect: () => {
        watched.clear();
      },
    };

    watchers.push({ observer, notify, watched });
    return observer;
  };

  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: function (notify: ResizeObserverCallback): ResizeObserver {
      return create(notify);
    },
  });

  return {
    deliver: (targets) => {
      for (const { observer, notify, watched } of watchers) {
        const entries = targets.filter((target) => watched.has(target)).map(entryOf);

        if (entries.length > 0) {
          notify(entries, observer);
        }
      }
    },
    restore: () => {
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
    },
  };
};
