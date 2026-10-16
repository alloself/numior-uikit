import { inlineText } from '../commands/input';
import type { InputIntent } from '../state/input.types';
import {
  descAround,
  redrawContent,
  textblockAround,
  widgetAround,
  type ElementDesc,
  type ViewContext,
} from './desc';
import type { ViewHost } from './host.types';
import { contentStart } from './positions';

const ATOM = '￼';

export interface DomWatch {
  ignoreOwn(): void;
  startComposition(): void;
  endComposition(): void;
  destroy(): void;
}

const isLeafDom = (context: ViewContext, node: Node): boolean => {
  const desc = context.descs.get(node);

  return desc?.kind === 'element' && desc.contentDOM === null && desc.dom === node;
};

const readInline = (context: ViewContext, parent: Node): string => {
  let text = '';

  for (const child of parent.childNodes) {
    if (isLeafDom(context, child)) {
      text += ATOM;
    } else if (child instanceof Text) {
      text += child.data;
    } else if (child.nodeName !== 'BR') {
      text += readInline(context, child);
    }
  }
  return text;
};

const sizeOf = (context: ViewContext, node: Node): number => {
  if (isLeafDom(context, node)) {
    return 1;
  }
  return node instanceof Text ? node.data.length : readInline(context, node).length;
};

const offsetWithin = (context: ViewContext, parent: Node, target: Node, offset: number): number => {
  const children = [...parent.childNodes];

  if (parent === target) {
    return children.slice(0, offset).reduce((sum, child) => sum + sizeOf(context, child), 0);
  }
  let count = 0;

  for (const child of children) {
    if (child === target && child instanceof Text) {
      return count + offset;
    }
    if (child.contains(target)) {
      return count + (isLeafDom(context, child) ? 0 : offsetWithin(context, child, target, offset));
    }
    count += sizeOf(context, child);
  }
  return count;
};

const caretIn = (context: ViewContext, content: Node): number | undefined => {
  const selection = content.ownerDocument?.getSelection();
  const focus = selection?.focusNode;

  return focus === null || focus === undefined || !content.contains(focus)
    ? undefined
    : offsetWithin(context, content, focus, selection?.focusOffset ?? 0);
};

const commonPrefix = (left: string, right: string): number => {
  let index = 0;

  while (index < left.length && index < right.length && left[index] === right[index]) {
    index += 1;
  }
  return index;
};

const commonSuffix = (left: string, right: string, prefix: number): number => {
  let count = 0;
  const limit = Math.min(left.length, right.length) - prefix;

  while (count < limit && left[left.length - 1 - count] === right[right.length - 1 - count]) {
    count += 1;
  }
  return count;
};

const intentOf = (
  context: ViewContext,
  desc: ElementDesc,
  dom: string,
): InputIntent | undefined => {
  const model = inlineText(desc.node);
  const textblock = context.schema.nodes.get(desc.node.type)?.inlineContent === true;

  if (!textblock || dom === model || desc.contentDOM === null) {
    return undefined;
  }
  const prefix = commonPrefix(model, dom);
  const suffix = commonSuffix(model, dom, prefix);
  const start = contentStart(desc);

  const caret = caretIn(context, desc.contentDOM);

  return {
    kind: 'compose',
    text: dom.slice(prefix, dom.length - suffix).replaceAll(ATOM, ''),
    range: { from: start + prefix, to: start + model.length - suffix },
    caret: caret === undefined ? undefined : start + caret,
  };
};

export const createDomWatch = (host: ViewHost, apply: (intent: InputIntent) => void): DomWatch => {
  const pending = new Set<ElementDesc>();
  let composing = false;
  let observer: MutationObserver | undefined;

  const flush = (): void => {
    const blocks = [...pending];

    pending.clear();
    for (const desc of blocks) {
      const content = desc.contentDOM;

      const intent =
        content === null
          ? undefined
          : intentOf(host.context, desc, readInline(host.context, content));

      redrawContent(host.context, desc);
      observer?.takeRecords();
      if (intent !== undefined) {
        apply(intent);
      }
    }
  };

  const collect = (records: readonly MutationRecord[]): void => {
    for (const record of records) {
      if (widgetAround(host.context, record.target)) {
        continue;
      }

      const desc =
        textblockAround(host.context, record.target) ?? descAround(host.context, record.target);

      if (desc?.kind === 'element') {
        pending.add(desc);
      }
    }
    if (!composing) {
      flush();
    }
  };

  observer = typeof MutationObserver === 'function' ? new MutationObserver(collect) : undefined;
  observer?.observe(host.root, { childList: true, characterData: true, subtree: true });

  return {
    ignoreOwn: () => {
      observer?.takeRecords();
    },
    startComposition: () => {
      composing = true;
    },
    endComposition: () => {
      composing = false;
      collect(observer?.takeRecords() ?? []);
    },
    destroy: () => {
      observer?.disconnect();
    },
  };
};
