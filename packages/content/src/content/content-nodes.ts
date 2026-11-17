import { renderTree, type ElementNode, type Schema } from '@numior/editor-core';
import { h, type FunctionalComponent, type VNode } from 'vue';
import NuiContentCallout from './NuiContentCallout.vue';
import NuiContentLead from './NuiContentLead.vue';
import NuiContentToggle from './NuiContentToggle.vue';
import { fileKindOf } from './content-schema';
import { NuiContentNodeType, type NuiContentViews } from './content.types';
import { CONTENT_FILE_ICONS } from './file-icons';

interface ContentNodesProps {
  readonly root: ElementNode;
  readonly schema: Schema;
  readonly views: NuiContentViews;
}

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const marked = (
  tag: string,
  node: ElementNode,
  attrs: Readonly<Record<string, string>>,
  children: readonly (VNode | string)[],
): VNode | undefined => {
  switch (node.type) {
    case NuiContentNodeType.Toggle:
      return h(NuiContentToggle, {
        key: node.id,
        open: node.attrs.open === true,
        attributes: attrs,
        content: children,
      });
    case NuiContentNodeType.TodoItem:
      return h(NuiContentLead, {
        key: node.id,
        tag,
        attributes: attrs,
        content: children,
        icon: 'check',
        mark: 'nui-content__check-mark',
      });
    case NuiContentNodeType.File:
      return h(NuiContentLead, {
        key: node.id,
        tag,
        attributes: attrs,
        content: children,
        icon: CONTENT_FILE_ICONS[fileKindOf(textOf(node.attrs.type), textOf(node.attrs.name))],
      });
    case NuiContentNodeType.Callout:
      return h(NuiContentCallout, {
        key: node.id,
        value: node.attrs.tone,
        attributes: attrs,
        content: children,
      });
    default:
      return undefined;
  }
};

const plain = (
  tag: string,
  attrs: Readonly<Record<string, string>>,
  children: readonly (VNode | string)[],
  key: string | undefined,
  node: ElementNode | undefined,
): VNode =>
  (node === undefined ? undefined : marked(tag, node, attrs, children)) ??
  h(
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
