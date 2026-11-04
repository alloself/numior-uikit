import { ContentNodeKind, type ContentNode, type ElementNode } from '@numior/editor-core';
import type { NuiEditorBlock, NuiEditorHandlePlacement } from './block.types';

const declared = (
  blocks: readonly NuiEditorBlock[],
  node: ContentNode | undefined,
): NuiEditorHandlePlacement | undefined => {
  if (node?.kind !== ContentNodeKind.Element) {
    return undefined;
  }
  const handle = blocks.find((block) => block.name === node.type)?.handle;

  return typeof handle === 'function' ? handle(node) : handle;
};

export const handlePlacement = (
  blocks: readonly NuiEditorBlock[],
  node: ElementNode,
): NuiEditorHandlePlacement =>
  declared(blocks, node) ?? declared(blocks, node.content[0]) ?? 'push';
