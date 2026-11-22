import type { Dispatch, Doc, EditorState, ElementNode, Plugin, Schema } from '@numior/editor-core';
import type { Map as YMap, XmlElement } from 'yjs';

export interface YjsBindingOptions {
  readonly schema: Schema;
  readonly getState: () => EditorState | undefined;
  readonly dispatch: Dispatch;
  readonly onInvalid?: (() => void) | undefined;
}

export interface YjsBinding {
  readonly plugin: Plugin;
  readonly read: () => Doc | undefined;
  readonly seed: (doc: Doc) => void;
  readonly destroy: () => void;
}

export interface PlaceOrigin {
  readonly parent: string;
  readonly key: string;
}

export interface Place extends PlaceOrigin {
  readonly clock: number;
  readonly from?: PlaceOrigin | undefined;
}

export interface TreeIndex {
  readonly placeOf: (id: string) => PlaceOrigin | undefined;
  readonly rawOf: (id: string) => Place | undefined;
  readonly childrenOf: (parent: string) => readonly string[];
  readonly overrides: () => ReadonlyMap<string, PlaceOrigin>;
  readonly clock: () => number;
  readonly update: (changes: ReadonlyMap<string, Place | undefined>) => ReadonlySet<string>;
}

export interface TreeStore {
  readonly schema: Schema;
  readonly blocks: YMap<unknown>;
  readonly index: TreeIndex;
  readonly cache: Map<string, ElementNode>;
  readonly stale: Set<string>;
  readonly known: WeakMap<XmlElement, ElementNode>;
  readonly owners: WeakMap<object, string>;
}

export type RepairTarget =
  | { readonly kind: typeof RepairKind.Entry; readonly node: ElementNode }
  | {
      readonly kind: typeof RepairKind.Inline;
      readonly element: XmlElement;
      readonly owner: string;
    };

export const EntryField = {
  Type: 'nui:type',
  Place: 'nui:place',
} as const;

export const RepairKind = { Entry: 'entry', Inline: 'inline' } as const;
