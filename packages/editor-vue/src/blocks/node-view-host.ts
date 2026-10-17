import { shallowReactive } from 'vue';
import type { NodeViewEntry, NodeViewSink } from './node-views';

export interface NodeViewHost {
  readonly shown: ReadonlyMap<number, NodeViewEntry>;
  readonly sink: NodeViewSink;
  stop(): void;
}

const MARGIN = '100% 0px';

const CHUNK = '.nui-editor__chunk';

export const createNodeViewHost = (): NodeViewHost => {
  const entries = new Map<number, NodeViewEntry>();
  const shown = shallowReactive(new Map<number, NodeViewEntry>());
  const byElement = new WeakMap<Element, NodeViewEntry>();
  const chunks = new WeakSet<Element>();

  const show = (entry: NodeViewEntry): void => {
    if (entries.has(entry.key)) {
      shown.set(entry.key, entry);
    }
  };

  const showInside = (chunk: Element): void => {
    for (const entry of entries.values()) {
      if (!shown.has(entry.key) && chunk.contains(entry.dom)) {
        show(entry);
        observer?.unobserve(entry.dom);
      }
    }
  };

  const reveal = (target: Element): void => {
    const entry = byElement.get(target);

    if (chunks.has(target)) {
      showInside(target);
    } else if (entry !== undefined) {
      show(entry);
      observer?.unobserve(target);
    }
  };

  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (records) => {
            for (const record of records.filter((found) => found.isIntersecting)) {
              reveal(record.target);
            }
          },
          { rootMargin: MARGIN },
        )
      : undefined;

  const watchChunk = (entry: NodeViewEntry): void => {
    const chunk = entry.dom.closest(CHUNK);

    if (chunk !== null && !shown.has(entry.key) && !chunks.has(chunk)) {
      chunks.add(chunk);
      observer?.observe(chunk);
    }
  };

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

          queueMicrotask(() => {
            watchChunk(entry);
          });
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
