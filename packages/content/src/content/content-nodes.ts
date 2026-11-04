import { renderTree, type ElementNode, type Schema } from '@numior/editor-core';
import { h, type FunctionalComponent, type VNode } from 'vue';
import NuiContentToggle from './NuiContentToggle.vue';
import { NuiContentNodeType, type NuiContentViews } from './content.types';

interface ContentNodesProps {
  readonly root: ElementNode;
  readonly schema: Schema;
  readonly views: NuiContentViews;
}

const plain = (
  tag: string,
  attrs: Readonly<Record<string, string>>,
  children: readonly (VNode | string)[],
  key: string | undefined,
  node: ElementNode | undefined,
): VNode =>
  node?.type === NuiContentNodeType.Toggle
    ? h(NuiContentToggle, {
        key: node.id,
        open: node.attrs.open === true,
        attributes: attrs,
        content: children,
      })
    : h(
        tag,
        key === undefined ? { ...attrs } : { ...attrs, key },
        children.length === 0 ? undefined : [...children],
      );

const text = (value: string): string => value;

export const ContentNodes: FunctionalComponent<ContentNodesProps> = (props) => [
  ...renderTree<VNode | string>(props.schema, props.root.content, {
    element: (tag, attrs, children, key, node) => {
      const view = node === undefined ? undefined : props.views[node.type];

      return view === undefined || node === undefined
        ? plain(tag, attrs, children, key, node)
        : h(view, { key: node.id, node });
    },
    text,
  }),
];

ContentNodes.props = ['root', 'schema', 'views'];
