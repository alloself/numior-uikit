const TRACK = '.nui-content__columns-track';

export const columnElements = (element: Element): HTMLElement[] =>
  [...(element.querySelector(TRACK)?.children ?? [])].flatMap((child) =>
    child instanceof HTMLElement ? [child] : [],
  );

const gapCentre = (first: DOMRect, second: DOMRect): number =>
  first.right <= second.left ? (first.right + second.left) / 2 : (second.right + first.left) / 2;

export const measureSeparators = (
  element: Element,
  separators: readonly HTMLElement[],
  rtl: boolean,
): void => {
  const box = element.getBoundingClientRect();
  const rects = columnElements(element).map((column) => column.getBoundingClientRect());

  separators.forEach((separator, index) => {
    const first = rects[index];
    const second = rects[index + 1];

    const wrapped =
      first === undefined || second === undefined || Math.abs(second.top - first.top) > 1;

    separator.hidden = wrapped;
    if (first === undefined || second === undefined || wrapped) {
      return;
    }
    const centre = gapCentre(first, second);

    separator.style.insetInlineStart = `${String(rtl ? box.right - centre : centre - box.left)}px`;
    separator.style.insetBlockStart = `${String(first.top - box.top)}px`;
    separator.style.blockSize = `${String(Math.max(first.height, second.height))}px`;
  });
};

export const ratioAt = (
  element: Element,
  index: number,
  clientX: number,
  rtl: boolean,
): number | undefined => {
  const [first, second] = columnElements(element)
    .slice(index, index + 2)
    .map((column) => column.getBoundingClientRect());

  if (first === undefined || second === undefined) {
    return undefined;
  }
  const span = Math.max(first.right, second.right) - Math.min(first.left, second.left);
  const from = rtl ? first.right - clientX : clientX - first.left;

  return span <= 0 ? undefined : from / span;
};
