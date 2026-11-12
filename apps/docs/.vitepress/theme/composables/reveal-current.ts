const SCROLLING = new Set(['auto', 'scroll']);

const scrollerOf = (element: HTMLElement): HTMLElement | undefined => {
  let node = element.parentElement;

  while (node !== null) {
    if (SCROLLING.has(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return undefined;
};

const isOutside = (item: DOMRect, frame: DOMRect): boolean =>
  item.top < frame.top || item.bottom > frame.bottom;

export const revealCurrent = (root: Element | null | undefined): void => {
  const current = root?.querySelector<HTMLElement>('[aria-current="page"]') ?? undefined;
  const scroller = current === undefined ? undefined : scrollerOf(current);

  if (current === undefined || scroller === undefined) {
    return;
  }

  const item = current.getBoundingClientRect();
  const frame = scroller.getBoundingClientRect();

  if (!isOutside(item, frame)) {
    return;
  }

  scroller.scrollTop += item.top - frame.top - (frame.height - item.height) / 2;
};
