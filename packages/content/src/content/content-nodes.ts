import type { ElementNode, Schema } from '@numior/editor-core';
import { h, type FunctionalComponent, type VNode } from 'vue';
import { buildContent } from './content-tree';

interface ContentNodesProps {
  readonly root: ElementNode;
  readonly schema: Schema;
}

const element = (
  tag: string,
  attrs: Readonly<Record<string, string>>,
  children: readonly (VNode | string)[],
  key: string | undefined,
): VNode =>
  h(
    tag,
    key === undefined ? { ...attrs } : { ...attrs, key },
    children.length === 0 ? undefined : [...children],
  );

const text = (value: string): string => value;

export const ContentNodes: FunctionalComponent<ContentNodesProps> = (props) => [
  ...buildContent<VNode | string>(props.schema, props.root, { element, text }),
];

ContentNodes.props = ['root', 'schema'];
