import type { ResolvedPos } from '../doc/doc.types';
import { nodeSize } from '../model/node';
import type { ElementNode } from '../model/node.types';

const replaceChild = (parent: ElementNode, index: number, child: ElementNode): ElementNode => {
  const previous = parent.content[index];

  return {
    ...parent,
    content: parent.content.with(index, child),
    size: parent.size - (previous === undefined ? 0 : nodeSize(previous)) + child.size,
  };
};

export const liftInto = (resolved: ResolvedPos, depth: number, node: ElementNode): ElementNode => {
  let current = node;

  for (let level = depth - 1; level >= 0; level -= 1) {
    current = replaceChild(resolved.node(level), resolved.indexAt(level), current);
  }
  return current;
};
