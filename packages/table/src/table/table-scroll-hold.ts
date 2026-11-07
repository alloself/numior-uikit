import type { TableScrollMark } from './table.types';

const marksFrom = (element: Element | null, marks: TableScrollMark[]): TableScrollMark[] => {
  if (element === null) {
    return marks;
  }
  marks.push({ element, top: element.scrollTop, left: element.scrollLeft });
  return marksFrom(element.parentElement, marks);
};

const restore = (mark: TableScrollMark): void => {
  if (mark.element.scrollTop !== mark.top) {
    mark.element.scrollTop = mark.top;
  }
  if (mark.element.scrollLeft !== mark.left) {
    mark.element.scrollLeft = mark.left;
  }
};

const NOTHING = (): void => undefined;

export const holdScrollAfterResize = (element: Element): (() => void) => {
  if (typeof ResizeObserver === 'undefined' || typeof requestAnimationFrame === 'undefined') {
    return NOTHING;
  }
  const root = element.ownerDocument;
  let marks: readonly TableScrollMark[] = [];
  let frame = 0;

  const onScroll = (event: Event): void => {
    const target = event.target === root ? root.scrollingElement : event.target;

    marks.forEach((mark) => {
      if (mark.element === target) {
        restore(mark);
      }
    });
  };

  const release = (): void => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    root.removeEventListener('scroll', onScroll, true);
  };

  const observer = new ResizeObserver(() => {
    observer.disconnect();
    marks = marksFrom(element.parentElement, []);
    root.addEventListener('scroll', onScroll, { capture: true, passive: true });
    frame = requestAnimationFrame(release);
  });

  observer.observe(element);
  return release;
};
