const SHOWN_WIDTH = 80;

const CLIPPED_WIDTH = 240;

export const layOutText = (element: Element, clipped: boolean): void => {
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: SHOWN_WIDTH });

  Object.defineProperty(element, 'scrollWidth', {
    configurable: true,
    value: clipped ? CLIPPED_WIDTH : SHOWN_WIDTH,
  });
};

export const describedText = (element: Element): string =>
  (element.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .reduce<string[]>((texts, id) => {
      const text = id === '' ? '' : (document.getElementById(id)?.textContent?.trim() ?? '');

      return text === '' ? texts : [...texts, text];
    }, [])
    .join(' ');

export const nativeTitles = (root: Element): string[] =>
  [...root.querySelectorAll('[title]')].reduce<string[]>(
    (titles, element) =>
      element instanceof HTMLIFrameElement
        ? titles
        : [...titles, element.getAttribute('title') ?? ''],
    [],
  );
