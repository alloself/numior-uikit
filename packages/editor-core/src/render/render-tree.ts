import {
  ContentNodeKind,
  type ContentNode,
  type ElementNode,
  type TextNode,
} from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import { RenderChildKind, type RenderChild, type RenderElement } from './render.types';
import { HtmlTag } from '../html/html.types';

export interface RenderBuilder<T> {
  readonly element: (
    tag: string,
    attrs: Readonly<Record<string, string>>,
    children: readonly T[],
    key: string | undefined,
    node: ElementNode | undefined,
  ) => T;
  readonly text: (text: string) => T;
}

interface Walk<T> {
  readonly schema: Schema;
  readonly builder: RenderBuilder<T>;
}

const fromSpec = <T>(
  walk: Walk<T>,
  spec: RenderChild,
  hole: () => readonly T[],
  node?: ElementNode,
): readonly T[] => {
  switch (spec.kind) {
    case RenderChildKind.Text:
      return [walk.builder.text(spec.text)];
    case RenderChildKind.Hole:
      return hole();
    case RenderChildKind.Element:
      return [
        walk.builder.element(
          spec.tag,
          spec.attrs,
          spec.children.flatMap((child) => fromSpec(walk, child, hole)),
          node?.id,
          node,
        ),
      ];
  }
};

const holds = (spec: RenderChild): boolean =>
  spec.kind === RenderChildKind.Hole ||
  (spec.kind === RenderChildKind.Element && spec.children.some(holds));

const withHole = (spec: RenderElement, leaf: boolean): RenderElement =>
  leaf || holds(spec) ? spec : { ...spec, children: [{ kind: 'hole' }] };

const fromText = <T>(walk: Walk<T>, node: TextNode): readonly T[] =>
  node.marks.reduceRight<readonly T[]>(
    (inner, mark) => {
      const type = walk.schema.marks.get(mark.type);

      return type === undefined
        ? inner
        : fromSpec(walk, withHole(type.render(mark), false), () => inner);
    },
    [walk.builder.text(node.text)],
  );

const rendersBreak = (schema: Schema, node: ContentNode | undefined): boolean =>
  node === undefined ||
  (node.kind === ContentNodeKind.Element &&
    schema.nodes.get(node.type)?.render(node).tag === HtmlTag.Br);

const fromElement = <T>(walk: Walk<T>, node: ElementNode): readonly T[] => {
  const type = walk.schema.nodes.get(node.type);

  if (type === undefined) {
    return [];
  }

  if (type.renderSubtree !== undefined) {
    return fromSpec(walk, type.renderSubtree(node), () => [], node);
  }

  const trail =
    type.inlineContent && rendersBreak(walk.schema, node.content.at(-1))
      ? [walk.builder.element('br', {}, [], undefined, undefined)]
      : [];

  return fromSpec(
    walk,
    withHole(type.render(node), type.leaf),
    () => [...fromChildren(walk, node.content), ...trail],
    node,
  );
};

const fromChildren = <T>(walk: Walk<T>, content: readonly ContentNode[]): readonly T[] =>
  content.flatMap((child) =>
    child.kind === ContentNodeKind.Text ? fromText(walk, child) : fromElement(walk, child),
  );

export const renderTree = <T>(
  schema: Schema,
  content: readonly ContentNode[],
  builder: RenderBuilder<T>,
): readonly T[] => fromChildren({ schema, builder }, content);
