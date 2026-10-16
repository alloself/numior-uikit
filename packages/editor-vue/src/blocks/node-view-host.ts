import { shallowReactive } from 'vue';
import type { NodeViewEntry, NodeViewSink } from './node-views';

export interface NodeViewHost {
  readonly shown: ReadonlyMap<number, NodeViewEntry>;
  readonly sink: NodeViewSink;
  stop(): void;
}

const MARGIN = '100% 0px';

export const createNodeViewHost = (): NodeViewHost => {
  const entries = new Map<number, NodeViewEntry>();
  const shown = shallowReactive(new Map<number, NodeViewEntry>());
  const byElement = new WeakMap<Element, NodeViewEntry>();

  const show = (entry: NodeViewEntry): void => {
    if (entries.has(entry.key)) {
      shown.set(entry.key, entry);
    }
  };

  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (records) => {
            for (const record of records) {
              const entry = byElement.get(record.target);

              if (record.isIntersecting && entry !== undefined) {
                show(entry);
                observer?.unobserve(record.target);
              }
            }
          },
          { rootMargin: MARGIN },
        )
      : undefined;

  return {
    shown,
    sink: {
      add: (entry) => {
        entries.set(entry.key, entry);
        byElement.set(entry.dom, entry);
        if (observer === undefined) {
          show(entry);
        } else {
          observer.observe(entry.dom);
        }
      },
      remove: (key) => {
        const entry = entries.get(key);

        if (entry !== undefined) {
          observer?.unobserve(entry.dom);
        }
        entries.delete(key);
        shown.delete(key);
      },
    },
    stop: () => {
      observer?.disconnect();
    },
  };
};
