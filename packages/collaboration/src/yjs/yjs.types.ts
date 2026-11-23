import type {
  Dispatch,
  Doc,
  EditorState,
  ElementNode,
  IdSource,
  Plugin,
  Schema,
} from '@numior/editor-core';
import type { Array as YArray, Map as YMap, XmlElement, XmlText } from 'yjs';

export interface YjsBindingOptions {
  readonly schema: Schema;
  readonly getState: () => EditorState | undefined;
  readonly dispatch: Dispatch;
  readonly onInvalid?: (() => void) | undefined;
}

export interface YjsBinding {
  readonly plugin: Plugin;
  readonly ids: IdSource;
  readonly read: () => Doc | undefined;
  readonly seed: (doc: Doc) => void;
  readonly destroy: () => void;
}

export type Fields = Readonly<Record<string, unknown>>;

export type ReadBlock = ElementNode | typeof Skipped | undefined;

export type Known = WeakMap<XmlElement, ElementNode>;

export type Entry = XmlText | YMap<unknown>;

export interface ReadContext {
  readonly schema: Schema;
  readonly known: Known;
}

export interface TreeStore extends ReadContext {
  readonly blocks: YMap<unknown>;
  readonly plain: string | undefined;
  readonly root: YArray<unknown>;
  readonly cache: Map<string, ElementNode>;
  readonly stale: Set<string>;
  readonly parents: Map<string, string>;
  readonly loose: Set<string>;
  readonly copies: Set<string>;
}

export type RepairTarget =
  | { readonly kind: typeof RepairKind.Entry; readonly node: ElementNode }
  | {
      readonly kind: typeof RepairKind.Inline;
      readonly element: XmlElement;
      readonly line: XmlText;
      readonly owner: string;
    };

export type Atom =
  | { readonly kind: typeof AtomKind.Text; readonly text: string; readonly format: Fields }
  | { readonly kind: typeof AtomKind.Embed; readonly key: string; readonly element?: XmlElement };

export type EntryKind = (typeof EntryKind)[keyof typeof EntryKind];

export const EntryField = {
  Type: 'nui:type',
  Children: 'nui:children',
} as const;

export const EntryKind = { Line: 'line', Holder: 'holder' } as const;

export const AtomKind = { Text: 'text', Embed: 'embed' } as const;

export const RepairKind = { Entry: 'entry', Inline: 'inline' } as const;

export const Skipped = Symbol('skipped');
