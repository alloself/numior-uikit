import type { RenderElement } from '../render/render.types';

export interface RenderedDom {
  readonly dom: HTMLElement;
  readonly contentDOM: HTMLElement | null;
}

const build = (document: Document, spec: RenderElement, holes: HTMLElement[]): HTMLElement => {
  const element = document.createElement(spec.tag);

  for (const [name, value] of Object.entries(spec.attrs)) {
    element.setAttribute(name, value);
  }
  for (const child of spec.children) {
    switch (child.kind) {
      case 'hole':
        holes.push(element);
        break;
      case 'text':
        element.append(document.createTextNode(child.text));
        break;
      case 'element':
        element.append(build(document, child, holes));
        break;
    }
  }
  return element;
};

const freezeSiblings = (path: Element, root: HTMLElement): void => {
  let current = path;

  while (current !== root) {
    const parent = current.parentElement;

    if (parent === null) {
      return;
    }
    for (const sibling of parent.childNodes) {
      if (sibling === current) {
        continue;
      }
      if (!(sibling instanceof Element)) {
        throw new RangeError('Static text beside the content of a node must sit inside an element');
      }
      sibling.setAttribute('contenteditable', 'false');
    }
    current = parent;
  }
};

export const renderLeaf = (document: Document, spec: RenderElement): HTMLElement => {
  const holes: HTMLElement[] = [];
  const dom = build(document, spec, holes);

  if (holes.length > 0) {
    throw new RangeError(`A leaf cannot render a content hole in <${spec.tag}>`);
  }
  if (dom.tagName !== 'BR') {
    dom.setAttribute('contenteditable', 'false');
  }
  return dom;
};

export const renderParent = (document: Document, spec: RenderElement): RenderedDom => {
  const holes: HTMLElement[] = [];
  const dom = build(document, spec, holes);
  const [hole, ...extra] = holes;

  if (extra.length > 0) {
    throw new RangeError(`<${spec.tag}> renders more than one content hole`);
  }
  if (hole === undefined) {
    if (spec.children.length > 0) {
      throw new RangeError(`<${spec.tag}> renders static children without a content hole`);
    }
    return { dom, contentDOM: dom };
  }
  if (hole.childNodes.length > 0) {
    throw new RangeError('A content hole must be the only child of its element');
  }
  freezeSiblings(hole, dom);
  return { dom, contentDOM: hole };
};
