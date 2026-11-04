import type { ElementNode, Mark } from '../model/node.types';

export type RenderAttrValue = string | number | boolean | null | undefined;

export interface RenderElement {
  readonly kind: typeof RenderChildKind.Element;
  readonly tag: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly children: readonly RenderChild[];
}

export interface RenderText {
  readonly kind: typeof RenderChildKind.Text;
  readonly text: string;
}

export interface RenderHole {
  readonly kind: typeof RenderChildKind.Hole;
}

export type RenderChild = RenderElement | RenderText | RenderHole;

export type NodeRender = (node: ElementNode) => RenderElement;

export type MarkRender = (mark: Mark) => RenderElement;

export const RenderChildKind = { Element: 'element', Text: 'text', Hole: 'hole' } as const;
