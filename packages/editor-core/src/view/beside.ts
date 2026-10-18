import { isAtom } from '../commands/atoms';
import type { ViewContext } from './desc';

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

const atomIn = (context: ViewContext, chunk: Element, y: number): string | undefined => {
  const blocks = [...chunk.children].filter((child) => context.descs.has(child));
  const block = blocks.find((child) => spans(child, y)) ?? nearest(blocks, y);
  const desc = block === undefined ? undefined : context.descs.get(block);

  return desc?.kind === 'element' && isAtom(context.schema, desc.node) ? desc.node.id : undefined;
};

export const atomBeside = (
  context: ViewContext,
  root: HTMLElement,
  event: MouseEvent,
): string | undefined => {
  const target = event.target;

  if (event.button !== 0 || !(target instanceof Element)) {
    return undefined;
  }
  if (target !== root && target.parentElement !== root) {
    return undefined;
  }
  const chunk = [...root.children].find((child) => spans(child, event.clientY));

  return chunk === undefined ? undefined : atomIn(context, chunk, event.clientY);
};
