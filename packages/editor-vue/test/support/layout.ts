const LINE = 20;

const PAD = 5;

const WIDTH = 400;

const rects = new Map<Element, DOMRect>();

const leafy = (element: Element): boolean =>
  ['P', 'H1', 'H2', 'H3', 'PRE', 'HR'].includes(element.tagName) ||
  element.classList.contains('nui-editor__widget');

const blocksOf = (element: Element): Element[] =>
  [...element.children].filter(
    (child) => !child.classList.contains('nui-editor__widget') && child.tagName !== 'BR',
  );

const place = (element: Element, top: number, depth: number): number => {
  if (leafy(element)) {
    rects.set(element, new DOMRect(depth * PAD, top, WIDTH - depth * PAD, LINE));
    return top + LINE;
  }
  const inset = element.classList.contains('nui-editor__chunk') ? 0 : PAD;
  let cursor = top + inset;

  for (const child of blocksOf(element)) {
    cursor = place(child, cursor, depth + 1);
  }
  const bottom = cursor + inset;

  rects.set(element, new DOMRect(depth * PAD, top, WIDTH - depth * PAD, bottom - top));
  return bottom;
};

const depthOf = (element: Element): number => {
  let depth = 0;

  for (let current = element.parentElement; current !== null; current = current.parentElement) {
    depth += 1;
  }
  return depth;
};

const rectOf = function (this: Element): DOMRect {
  return rects.get(this) ?? new DOMRect();
};

const hits = (x: number, y: number): Element[] =>
  [...rects.entries()]
    .filter(([, rect]) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
    .map(([element]) => element)
    .toSorted((left, right) => depthOf(right) - depthOf(left));

export const layOut = (content: Element): void => {
  rects.clear();
  let cursor = 0;

  for (const chunk of blocksOf(content)) {
    cursor = place(chunk, cursor, 0);
  }
  rects.set(content, new DOMRect(0, 0, WIDTH, cursor));
  Element.prototype.getBoundingClientRect = rectOf;
  Document.prototype.elementsFromPoint = hits;
};
