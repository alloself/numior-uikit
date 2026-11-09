import type { Dispatch, Doc, EditorState, Plugin, Schema } from '@numior/editor-core';

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
