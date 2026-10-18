import type { GapSide, Selection } from '../state/selection.types';
import type { ViewHost } from './host.types';

interface Box {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

const GAP_CLASS = 'nui-editor__gap';

const VISUAL =
  'img, svg, video, iframe, canvas, button, input, textarea, select, hr, [role="button"], [role="combobox"]';

const TRANSPARENT = new Set(['transparent', 'rgba(0, 0, 0, 0)']);

const painted = (style: CSSStyleDeclaration): boolean =>
  !TRANSPARENT.has(style.backgroundColor) ||
  (style.borderInlineStartStyle !== 'none' && Number.parseFloat(style.borderInlineStartWidth) > 0);

const union = (boxes: readonly (Box | undefined)[]): Box | undefined =>
  boxes.reduce<Box | undefined>((all, box) => {
    if (box === undefined) {
      return all;
    }
    return all === undefined
      ? box
      : {
          left: Math.min(all.left, box.left),
          right: Math.max(all.right, box.right),
          top: Math.min(all.top, box.top),
          bottom: Math.max(all.bottom, box.bottom),
        };
  }, undefined);

const sized = (box: Box): Box | undefined =>
  box.right > box.left && box.bottom > box.top ? box : undefined;

const textBox = (text: Text): Box | undefined => {
  if (text.data.trim() === '') {
    return undefined;
  }
  const range = text.ownerDocument.createRange();

  range.selectNodeContents(text);
  return union([...(range.getClientRects?.() ?? [])].map(sized));
};

const contentOf = (element: Element): Box | undefined => {
  const style = getComputedStyle(element);

  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.position === 'fixed' ||
    element.hasAttribute('popover')
  ) {
    return undefined;
  }
  if (style.display !== 'contents' && (element.matches(VISUAL) || painted(style))) {
    return sized(element.getBoundingClientRect());
  }
  return union(
    [...element.childNodes].map((child) => {
      if (child instanceof Text) {
        return textBox(child);
      }
      return child instanceof Element ? contentOf(child) : undefined;
    }),
  );
};

const boxOf = (host: ViewHost, id: string): Box | undefined => {
  const dom = host.context.byId.get(id)?.dom;

  return dom === undefined ? undefined : (contentOf(dom) ?? sized(dom.getBoundingClientRect()));
};

const rtl = (host: ViewHost): boolean => getComputedStyle(host.root).direction === 'rtl';

const logical = (host: ViewHost, left: boolean): GapSide => (left !== rtl(host) ? 'start' : 'end');

export const sideOutside = (host: ViewHost, id: string, x: number): GapSide | undefined => {
  const box = boxOf(host, id);

  if (box === undefined || (x >= box.left && x <= box.right)) {
    return undefined;
  }
  return logical(host, x < box.left);
};

export const sideNearest = (host: ViewHost, id: string, x: number): GapSide => {
  const box = boxOf(host, id);

  return logical(host, box === undefined || x < (box.left + box.right) / 2);
};

export const gapX = (host: ViewHost, selection: Selection): number | undefined => {
  if (selection.kind !== 'gap' && selection.kind !== 'node') {
    return undefined;
  }
  const box = boxOf(host, selection.id);

  if (box === undefined || selection.kind === 'node') {
    return box === undefined ? undefined : (box.left + box.right) / 2;
  }
  return (selection.side === 'start') !== rtl(host) ? box.left : box.right;
};

const CARET = 2;

export const paintGap = (host: ViewHost, element: HTMLElement, id: string, side: GapSide): void => {
  const box = boxOf(host, id);
  const own = element.getBoundingClientRect();

  if (box === undefined) {
    return;
  }
  const atLeft = (side === 'start') !== rtl(host);
  const x = atLeft ? box.left - CARET - 1 : box.right + 1;
  const start = rtl(host) ? own.right - x - CARET : x - own.left;

  element.classList.add(GAP_CLASS);
  element.style.setProperty('--_gap-start', `${String(start)}px`);
  element.style.setProperty('--_gap-top', `${String(box.top - own.top)}px`);
  element.style.setProperty('--_gap-size', `${String(box.bottom - box.top)}px`);
};

export const clearGap = (element: HTMLElement): void => {
  element.classList.remove(GAP_CLASS);
  element.style.removeProperty('--_gap-start');
  element.style.removeProperty('--_gap-top');
  element.style.removeProperty('--_gap-size');
};
