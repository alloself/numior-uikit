import { isBlockAtom } from '../commands/atoms';
import { nearestCursor } from '../state/selection';
import type { Selection } from '../state/selection.types';
import { posAtCoords } from './coords';
import { sideNearest, sideOutside } from './gap';
import type { ViewHost } from './host.types';

const spans = (element: Element, y: number): boolean => {
  const box = element.getBoundingClientRect();

  return y >= box.top && y <= box.bottom;
};

const distance = (element: Element, y: number): number => {
  const box = element.getBoundingClientRect();

  return Math.max(box.top - y, y - box.bottom, 0);
};

const nearest = (elements: readonly Element[], y: number): Element | undefined =>
  elements.reduce<Element | undefined>(
    (best, element) =>
      best === undefined || distance(element, y) < distance(best, y) ? element : best,
    undefined,
  );

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
  const blocks = [...chunk.children].filter((child) => context.descs.has(child));
  const row = blocks.find((child) => spans(child, y));
  const block = row ?? nearest(blocks, y);
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
    sideOutside(host, id, x) ??
    (row === undefined ? (above ? 'start' : 'end') : sideNearest(host, id, x));

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
  const chunk = [...root.children].find((child) => spans(child, event.clientY));

  return chunk === undefined ? undefined : gapIn(host, chunk, event.clientX, event.clientY);
};
