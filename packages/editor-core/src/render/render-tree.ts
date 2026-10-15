import type { ContentNode, ElementNode, TextNode } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import type { RenderChild, RenderElement } from './render.types';

export interface RenderBuilder<T> {
  readonly element: (
    tag: string,
    attrs: Readonly<Record<string, string>>,
    children: readonly T[],
    key: string | undefined,
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
  key?: string,
): readonly T[] => {
  switch (spec.kind) {
    case 'text':
      return [walk.builder.text(spec.text)];
    case 'hole':
      return hole();
    case 'element':
      return [
        walk.builder.element(
          spec.tag,
          spec.attrs,
          spec.children.flatMap((child) => fromSpec(walk, child, hole)),
          key,
        ),
      ];
  }
};

const holds = (spec: RenderChild): boolean =>
  spec.kind === 'hole' || (spec.kind === 'element' && spec.children.some(holds));

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
  (node.kind === 'element' && schema.nodes.get(node.type)?.render(node).tag === 'br');

const fromElement = <T>(walk: Walk<T>, node: ElementNode): readonly T[] => {
  const type = walk.schema.nodes.get(node.type);

  if (type === undefined) {
    return [];
  }

  const trail =
    type.inlineContent && rendersBreak(walk.schema, node.content.at(-1))
      ? [walk.builder.element('br', {}, [], undefined)]
      : [];

  return fromSpec(
    walk,
    withHole(type.render(node), type.leaf),
    () => [...fromChildren(walk, node.content), ...trail],
    node.id,
  );
};

const fromChildren = <T>(walk: Walk<T>, content: readonly ContentNode[]): readonly T[] =>
  content.flatMap((child) =>
    child.kind === 'text' ? fromText(walk, child) : fromElement(walk, child),
  );

export const renderTree = <T>(
  schema: Schema,
  content: readonly ContentNode[],
  builder: RenderBuilder<T>,
): readonly T[] => fromChildren({ schema, builder }, content);
