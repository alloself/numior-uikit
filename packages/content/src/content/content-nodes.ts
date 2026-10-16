import { renderTree, type ElementNode, type Schema } from '@numior/editor-core';
import { h, type FunctionalComponent, type VNode } from 'vue';
import { ContentToggle } from './content-toggle';

interface ContentNodesProps {
  readonly root: ElementNode;
  readonly schema: Schema;
}

const element = (
  tag: string,
  attrs: Readonly<Record<string, string>>,
  children: readonly (VNode | string)[],
  key: string | undefined,
  node: ElementNode | undefined,
): VNode =>
  node?.type === 'toggle'
    ? h(ContentToggle, { key: node.id, open: node.attrs.open === true, attrs, content: children })
    : h(
        tag,
        key === undefined ? { ...attrs } : { ...attrs, key },
        children.length === 0 ? undefined : [...children],
      );

const text = (value: string): string => value;

export const ContentNodes: FunctionalComponent<ContentNodesProps> = (props) => [
  ...renderTree<VNode | string>(props.schema, props.root.content, { element, text }),
];

ContentNodes.props = ['root', 'schema'];
