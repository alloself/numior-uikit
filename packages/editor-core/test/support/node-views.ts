import type { ElementNode } from '../../src';
import type { NodeView, NodeViewFactory } from '../../src/view';

export interface NodeViewLog {
  readonly updates: string[];
  readonly destroyed: string[];
}

const boxOf = (node: ElementNode, log: NodeViewLog): NodeView => {
  const dom = document.createElement('div');
  const widget = document.createElement('span');
  const body = document.createElement('div');

  widget.setAttribute('contenteditable', 'false');
  widget.className = 'box__widget';
  dom.className = `box box--${String(node.attrs.tone)}`;
  dom.append(widget, body);

  return {
    dom,
    contentDOM: body,
    update: (next) => {
      log.updates.push(`${next.id}:${String(next.attrs.tone)}`);
      dom.className = `box box--${String(next.attrs.tone)}`;
      return next.attrs.tone !== 'locked';
    },
    destroy: () => {
      log.destroyed.push(node.id);
    },
  };
};

const ruleOf = (): NodeView => {
  const dom = document.createElement('div');
  const widget = document.createElement('div');
  const label = document.createElement('span');
  const button = document.createElement('button');

  dom.setAttribute('contenteditable', 'false');
  widget.className = 'box__widget';
  label.className = 'box__label';
  label.append('Rule');
  button.type = 'button';
  widget.append(label, button);
  dom.append(widget);

  return { dom, contentDOM: null, update: () => true, destroy: () => undefined };
};

export const boxViews = (log: NodeViewLog): Readonly<Record<string, NodeViewFactory>> => ({
  callout: (node) => boxOf(node, log),
  divider: () => ruleOf(),
});
