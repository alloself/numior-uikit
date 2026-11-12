interface Watcher {
  readonly observer: ResizeObserver;
  readonly notify: ResizeObserverCallback;
  readonly watched: Set<Element>;
}

export interface RowObserverStub {
  deliver(targets: readonly Element[]): void;
  restore(): void;
}

const entryOf = (target: Element): ResizeObserverEntry => {
  const contentRect = target.getBoundingClientRect();

  return {
    target,
    contentRect,
    borderBoxSize: [],
    contentBoxSize: [{ inlineSize: contentRect.width, blockSize: contentRect.height }],
    devicePixelContentBoxSize: [],
  };
};

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
        const entries = targets.reduce<ResizeObserverEntry[]>((found, target) => {
          if (watched.has(target)) {
            found.push(entryOf(target));
          }
          return found;
        }, []);

        if (entries.length === 0) {
          continue;
        }

        notify(entries, observer);
      }
    },
    restore: () => {
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
    },
  };
};
