import { isBlockAtom } from '../commands/atoms';
import { nearestCursor } from '../state/selection';
import type { Selection } from '../state/selection.types';
import { posAtCoords } from './coords';
import type { Desc } from './desc';
import { sideNearest, sideOutside } from './gap';
import type { ViewHost } from './host.types';

interface BlockHit {
  readonly block: Element | undefined;
  readonly row: boolean;
}

const spans = (element: Element, y: number): boolean => {
  const box = element.getBoundingClientRect();

  return y >= box.top && y <= box.bottom;
};

const childSpanning = (parent: Element, y: number): Element | undefined => {
  for (const child of parent.children) {
    if (spans(child, y)) {
      return child;
    }
  }

  return undefined;
};

const blockAt = (chunk: Element, descs: WeakMap<Node, Desc>, y: number): BlockHit => {
  let near: Element | undefined;
  let nearGap = Number.POSITIVE_INFINITY;

  for (const child of chunk.children) {
    if (!descs.has(child)) {
      continue;
    }

    const box = child.getBoundingClientRect();

    if (y >= box.top && y <= box.bottom) {
      return { block: child, row: true };
    }

    const gap = Math.max(box.top - y, y - box.bottom);

    if (gap < nearGap) {
      near = child;
      nearGap = gap;
    }
  }

  return { block: near, row: false };
};

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

const textBeside = (host: ViewHost, box: DOMRect, x: number, y: number): Selection | undefined => {
  const pos = posAtCoords(
    host,
    clamp(x, box.left + 1, box.right - 1),
    clamp(y, box.top + 1, box.bottom - 1),
  );

  return pos === undefined ? undefined : nearestCursor(host.state().doc, pos);
};

const gapIn = (host: ViewHost, chunk: Element, x: number, y: number): Selection | undefined => {
  const { context } = host;
  const { block, row } = blockAt(chunk, context.descs, y);
  const desc = block === undefined ? undefined : context.descs.get(block);

  if (block === undefined || desc?.kind !== 'element') {
    return undefined;
  }
  const box = block.getBoundingClientRect();

  if (!isBlockAtom(context.schema, desc.node)) {
    return textBeside(host, box, x, y);
  }
  const id = desc.node.id;
  const above = y < box.top;

  const side =
    sideOutside(host, id, x) ?? (!row ? (above ? 'start' : 'end') : sideNearest(host, id, x));

  return { kind: 'gap', id, side };
};

export const pointBeside = (host: ViewHost, event: MouseEvent): Selection | undefined => {
  const { root } = host;
  const target = event.target;

  if (event.button !== 0 || !(target instanceof Element)) {
    return undefined;
  }
  if (target !== root && target.parentElement !== root) {
    return undefined;
  }
  const chunk = childSpanning(root, event.clientY);

  return chunk === undefined ? undefined : gapIn(host, chunk, event.clientX, event.clientY);
};
