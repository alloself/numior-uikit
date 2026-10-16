import { sameAttrs, type ElementNode, type Schema } from '@numior/editor-core';
import { renderNodeDOM, type NodeView, type NodeViewFactory } from '@numior/editor-core/view';
import { shallowRef, type ShallowRef } from 'vue';
import type { NuiEditorBlock } from './block.types';

export interface NodeViewEntry {
  readonly key: number;
  readonly block: NuiEditorBlock;
  readonly dom: HTMLElement;
  readonly widget: HTMLElement;
  readonly node: ShallowRef<ElementNode>;
}

export interface NodeViewSink {
  add(entry: NodeViewEntry): void;
  remove(key: number): void;
}

const WIDGET = 'nui-editor__widget';

const BODY = 'nui-editor__body';

const tokensOf = (element: Element): readonly string[] => [...element.classList];

const syncClasses = (dom: HTMLElement, before: Element, after: Element): void => {
  const next = new Set(tokensOf(after));

  for (const token of tokensOf(before)) {
    if (!next.has(token)) {
      dom.classList.remove(token);
    }
  }
  dom.classList.add(...next);
};

const syncAttrs = (dom: HTMLElement, before: Element, after: Element): void => {
  const names = new Set([...before.getAttributeNames(), ...after.getAttributeNames()]);

  for (const name of names) {
    const value = after.getAttribute(name);

    if (name === 'class') {
      syncClasses(dom, before, after);
    } else if (name !== 'contenteditable' && value === null) {
      dom.removeAttribute(name);
    } else if (name !== 'contenteditable' && value !== null) {
      dom.setAttribute(name, value);
    }
  }
};

const stripStatic = (dom: HTMLElement, content: HTMLElement | null): void => {
  if (content === null) {
    dom.replaceChildren();
    return;
  }
  for (const element of dom.querySelectorAll('[contenteditable="false"]')) {
    if (!element.contains(content)) {
      element.remove();
    }
  }
};

const bodyOf = (
  document: Document,
  dom: HTMLElement,
  content: HTMLElement | null,
): HTMLElement | null => {
  if (content !== dom) {
    return content;
  }
  const body = document.createElement('div');

  body.className = BODY;
  dom.append(body);
  return body;
};

interface ViewSource {
  readonly document: Document;
  readonly schema: Schema;
  readonly sink: NodeViewSink;
  readonly key: () => number;
}

const viewOf = (source: ViewSource, block: NuiEditorBlock, node: ElementNode): NodeView => {
  const { dom, contentDOM } = renderNodeDOM(source.document, source.schema, node);
  const widget = source.document.createElement('div');
  const key = source.key();
  const current = shallowRef(node);
  let rendered = dom.cloneNode(false);

  stripStatic(dom, contentDOM);
  widget.className = WIDGET;
  widget.setAttribute('contenteditable', 'false');

  const content = bodyOf(source.document, dom, contentDOM);

  if (block.at === 'end') {
    dom.append(widget);
  } else {
    dom.prepend(widget);
  }
  source.sink.add({ key, block, dom, widget, node: current });

  return {
    dom,
    contentDOM: content,
    update: (next) => {
      if (!sameAttrs(current.value.attrs, next.attrs)) {
        const fresh = renderNodeDOM(source.document, source.schema, next).dom;

        if (rendered instanceof Element) {
          syncAttrs(dom, rendered, fresh);
        }
        rendered = fresh;
      }
      current.value = next;
      return true;
    },
    destroy: () => {
      source.sink.remove(key);
    },
  };
};

export const createNodeViews = (
  document: Document,
  schema: Schema,
  blocks: readonly NuiEditorBlock[],
  sink: NodeViewSink,
): Readonly<Record<string, NodeViewFactory>> => {
  let counter = 0;

  const source: ViewSource = {
    document,
    schema,
    sink,
    key: () => {
      counter += 1;
      return counter;
    },
  };

  return Object.fromEntries(
    blocks
      .filter((block) => block.view !== undefined && schema.nodes.has(block.name))
      .map((block): [string, NodeViewFactory] => [
        block.name,
        (node) => viewOf(source, block, node),
      ]),
  );
};
