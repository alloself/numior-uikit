export type NodeId = string;

export type AttrValue = string | number | boolean | null;

export type Attrs = Readonly<Record<string, AttrValue>>;

export interface Mark {
  readonly type: string;
  readonly attrs: Attrs;
}

export interface TextNode {
  readonly kind: typeof ContentNodeKind.Text;
  readonly text: string;
  readonly marks: readonly Mark[];
}

export interface ElementNode {
  readonly kind: typeof ContentNodeKind.Element;
  readonly id: NodeId;
  readonly type: string;
  readonly attrs: Attrs;
  readonly content: readonly ContentNode[];
  readonly leaf: boolean;
  readonly size: number;
}

export type ContentNode = TextNode | ElementNode;

export interface IdSource {
  next(): NodeId;
}

export const ContentNodeKind = { Element: 'element', Text: 'text' } as const;
