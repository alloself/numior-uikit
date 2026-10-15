import type {
  AttrValue,
  ContentNode,
  ElementNode,
  Mark,
  NodeId,
  TextNode,
} from '../model/node.types';
import type { HtmlElement } from '../html/html.types';
import type { MarkRender, NodeRender } from '../render/render.types';

export interface AttrSpec {
  readonly default?: AttrValue | undefined;
  readonly verify?: ((value: AttrValue) => boolean) | undefined;
}

export type AttrSpecs = Readonly<Record<string, AttrSpec>>;

export type ParsedAttrs = Readonly<Record<string, AttrValue>> | false;

export interface NodeParseRule {
  readonly tag: string;
  readonly priority?: number | undefined;
  readonly attrs?: ((element: HtmlElement) => ParsedAttrs) | undefined;
}

export interface MarkParseRule {
  readonly tag?: string | undefined;
  readonly style?: string | undefined;
  readonly attrs?: ((element: HtmlElement) => ParsedAttrs) | undefined;
}

export interface NodeSpec {
  readonly content?: string | undefined;
  readonly group?: string | undefined;
  readonly inline?: boolean | undefined;
  readonly marks?: string | undefined;
  readonly attrs?: AttrSpecs | undefined;
  readonly code?: boolean | undefined;
  readonly render?: NodeRender | undefined;
  readonly parse?: readonly NodeParseRule[] | undefined;
}

export interface MarkSpec {
  readonly group?: string | undefined;
  readonly attrs?: AttrSpecs | undefined;
  readonly render?: MarkRender | undefined;
  readonly parse?: readonly MarkParseRule[] | undefined;
}

export interface SchemaSpec {
  readonly name?: string | undefined;
  readonly version?: number | undefined;
  readonly nodes: Readonly<Record<string, NodeSpec>>;
  readonly marks?: Readonly<Record<string, MarkSpec>> | undefined;
  readonly top?: string | undefined;
}

export interface ContentMatch {
  readonly validEnd: boolean;
  readonly next: ReadonlyMap<string, ContentMatch>;
  matchType(type: string): ContentMatch | undefined;
  matchContent(content: readonly ContentNode[]): ContentMatch | undefined;
}

export interface NodeType {
  readonly name: string;
  readonly groups: ReadonlySet<string>;
  readonly inline: boolean;
  readonly leaf: boolean;
  readonly inlineContent: boolean;
  readonly content: ContentMatch;
  readonly marks: ReadonlySet<string>;
  readonly attrs: AttrSpecs;
  readonly code: boolean;
  readonly render: NodeRender;
  readonly parse: readonly NodeParseRule[];
}

export interface MarkType {
  readonly name: string;
  readonly rank: number;
  readonly groups: ReadonlySet<string>;
  readonly attrs: AttrSpecs;
  readonly render: MarkRender;
  readonly parse: readonly MarkParseRule[];
}

export interface ElementInit {
  readonly id: NodeId;
  readonly attrs?: Readonly<Record<string, AttrValue>> | undefined;
  readonly content?: readonly ContentNode[] | undefined;
}

export interface SchemaLimits {
  readonly nodes?: readonly string[] | undefined;
  readonly marks?: readonly string[] | undefined;
}

export type DocIssue =
  | { readonly kind: 'type'; readonly path: readonly number[]; readonly type: string }
  | { readonly kind: 'content'; readonly path: readonly number[]; readonly type: string }
  | { readonly kind: 'mark'; readonly path: readonly number[]; readonly mark: string }
  | {
      readonly kind: 'attr';
      readonly path: readonly number[];
      readonly attr: string;
      readonly reason: 'missing' | 'unknown' | 'invalid';
    }
  | {
      readonly kind: 'id';
      readonly path: readonly number[];
      readonly id: NodeId;
      readonly reason: 'empty' | 'duplicate';
    }
  | {
      readonly kind: 'text';
      readonly path: readonly number[];
      readonly reason: 'empty' | 'unmerged';
    }
  | { readonly kind: 'size'; readonly path: readonly number[] };

export type DocCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly issues: readonly DocIssue[] };

export interface Schema {
  readonly name: string;
  readonly version: number;
  readonly spec: SchemaSpec;
  readonly top: NodeType;
  readonly nodes: ReadonlyMap<string, NodeType>;
  readonly marks: ReadonlyMap<string, MarkType>;
  text(text: string, marks?: readonly Mark[]): TextNode;
  element(type: string, init: ElementInit): ElementNode;
  mark(type: string, attrs?: Readonly<Record<string, AttrValue>>): Mark;
  check(root: ElementNode): DocCheck;
  restrict(limits: SchemaLimits): Schema;
}
