import type { ElementNode, Mark } from '../model/node.types';

export type RenderAttrValue = string | number | boolean | null | undefined;

export interface RenderElement {
  readonly kind: 'element';
  readonly tag: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly children: readonly RenderChild[];
}

export interface RenderText {
  readonly kind: 'text';
  readonly text: string;
}

export interface RenderHole {
  readonly kind: 'hole';
}

export type RenderChild = RenderElement | RenderText | RenderHole;

export type NodeRender = (node: ElementNode) => RenderElement;

export type MarkRender = (mark: Mark) => RenderElement;
