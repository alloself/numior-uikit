import {
  childNode,
  holdsSlots,
  isSlot,
  type ChildSlot,
  type EditorState,
  type ElementNode,
} from '@numior/editor-core';
import type { EditorView } from '@numior/editor-core/view';

export const BLOCK = '.nui-editor__chunk > *';

export const WIDGET = '.nui-editor__widget';

const MARKS = ['nui-editor__pushed', 'nui-editor__lifted', 'nui-editor__selected'];

const parentNode = (state: EditorState, id: string): ElementNode | undefined =>
  id === state.doc.root.id ? state.doc.root : state.doc.byId(id);

export const elementOf = (view: EditorView, slot: ChildSlot | undefined): Element | undefined => {
  const node = slot === undefined ? undefined : childNode(view.state.doc, slot);

  return node === undefined ? undefined : view.nodeDOM(node.id);
};

export const sameSlot = (left: ChildSlot | undefined, right: ChildSlot | undefined): boolean =>
  left?.parent === right?.parent && left?.index === right?.index;

export const indexAtY = (view: EditorView, parent: string, clientY: number): number => {
  const count = parentNode(view.state, parent)?.content.length ?? 0;
  let low = 0;
  let high = count - 1;

  while (low < high) {
    const middle = (low + high) >> 1;
    const rect = elementOf(view, { parent, index: middle })?.getBoundingClientRect();

    if (rect !== undefined && clientY > rect.bottom) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return Math.max(0, low);
};

export const markerSpace = (element: Element): number => {
  const parent = element.parentElement;

  return parent === null || getComputedStyle(element).display !== 'list-item'
    ? 0
    : Number.parseFloat(getComputedStyle(parent).paddingInlineStart) || 0;
};

export const paddingBox = (element: HTMLElement | null): DOMRect | undefined => {
  if (element === null) {
    return undefined;
  }
  const rect = element.getBoundingClientRect();

  return new DOMRect(
    rect.left + element.clientLeft,
    rect.top + element.clientTop,
    element.clientWidth,
    element.clientHeight,
  );
};

export const marginStart = (element: Element): number =>
  Number.parseFloat(getComputedStyle(element).marginInlineStart) || 0;

export const lineStart = (frame: DOMRect, element: Element, rtl: boolean): number => {
  const parent = element.parentElement ?? element;
  const rect = parent.getBoundingClientRect();
  const style = getComputedStyle(parent);

  return rtl
    ? frame.right - rect.right + (Number.parseFloat(style.paddingInlineEnd) || 0)
    : rect.left - frame.left + (Number.parseFloat(style.paddingInlineStart) || 0);
};

const shiftOf = (element: Element): number =>
  Number.parseFloat(getComputedStyle(element).translate.split(' ')[0] ?? '') || 0;

export const startEdge = (frame: DOMRect, element: Element, rtl: boolean): number => {
  const rect = element.getBoundingClientRect();
  const shift = shiftOf(element);
  const edge = rtl ? frame.right - rect.right + shift : rect.left - frame.left - shift;

  return edge - marginStart(element) - markerSpace(element);
};

const spans = (element: Element | undefined, clientY: number): boolean => {
  const rect = element?.getBoundingClientRect();

  return rect !== undefined && clientY >= rect.top && clientY <= rect.bottom;
};

const innerSlot = (view: EditorView, node: ElementNode, clientY: number): ChildSlot | undefined => {
  if (holdsSlots(view.state.doc, node)) {
    const index = indexAtY(view, node.id, clientY);

    return node.content.length === 0 || !isSlot(view.state.doc, node, index)
      ? undefined
      : { parent: node.id, index };
  }
  for (const child of node.content) {
    if (child.kind === 'element' && spans(view.nodeDOM(child.id), clientY)) {
      return innerSlot(view, child, clientY);
    }
  }
  return undefined;
};

export const deepestSlot = (view: EditorView, slot: ChildSlot, clientY: number): ChildSlot => {
  let current = slot;

  for (
    let node = childNode(view.state.doc, current);
    node !== undefined;
    node = childNode(view.state.doc, current)
  ) {
    const inner = innerSlot(view, node, clientY);

    if (inner === undefined) {
      return current;
    }
    current = inner;
  }
  return current;
};

const unmarked = (element: Element): void => {
  for (const name of MARKS) {
    element.classList.remove(name);
    for (const inner of element.querySelectorAll(`.${name}`)) {
      inner.classList.remove(name);
    }
  }
};

const inList = (element: Element, copy: Element): Element => {
  const parent = element.parentElement;
  const list = parent?.cloneNode(false);

  if (parent === null || !(list instanceof Element) || markerSpace(element) === 0) {
    return copy;
  }
  if (parent instanceof HTMLOListElement && list instanceof HTMLOListElement) {
    list.start = parent.start + [...parent.children].indexOf(element);
  }
  list.append(copy);
  return list;
};

export const ghostOf = (element: Element): Element | undefined => {
  const copy = element.cloneNode(true);

  if (!(copy instanceof Element)) {
    return undefined;
  }
  unmarked(copy);
  return inList(element, copy);
};
