import type { ElementNode, NodeId } from '../model/node.types';

export interface BlockSizes {
  watch(dom: HTMLElement, node: ElementNode): void;
  unwatch(dom: HTMLElement): void;
  destroy(): void;
}

const LINE_HEIGHT = 24;

const LINE_LENGTH = 80;

const estimate = (node: ElementNode): number =>
  Math.max(1, Math.ceil(node.size / LINE_LENGTH)) * LINE_HEIGHT;

const blockSizeOf = (entry: ResizeObserverEntry): number =>
  entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;

export const createBlockSizes = (): BlockSizes => {
  const heights = new Map<NodeId, number>();
  const ids = new WeakMap<Element, NodeId>();

  const observer =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver((entries) => {
          for (const entry of entries) {
            const id = ids.get(entry.target);
            const size = blockSizeOf(entry);

            if (id !== undefined && size > 0) {
              heights.set(id, size);
            }
          }
        })
      : undefined;

  return {
    watch: (dom, node) => {
      dom.style.setProperty('content-visibility', 'auto');

      dom.style.setProperty(
        'contain-intrinsic-block-size',
        `auto ${heights.get(node.id) ?? estimate(node)}px`,
      );

      ids.set(dom, node.id);
      observer?.observe(dom);
    },
    unwatch: (dom) => {
      observer?.unobserve(dom);
    },
    destroy: () => {
      observer?.disconnect();
    },
  };
};
