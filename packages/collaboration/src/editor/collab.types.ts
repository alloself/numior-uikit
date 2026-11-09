import type { Dispatch, Doc, EditorState, Schema, Step } from '@numior/editor-core';

export interface UnconfirmedStep {
  readonly step: Step;
  readonly inverted: Step;
}

export interface CollabState {
  readonly version: number;
  readonly unconfirmed: readonly UnconfirmedStep[];
}

export interface CollabOptions {
  readonly version?: number | undefined;
  readonly unconfirmed?: readonly UnconfirmedStep[] | undefined;
}

export interface RestoredDocument {
  readonly doc: Doc;
  readonly unconfirmed: readonly UnconfirmedStep[];
}

export interface EditorCollabOptions {
  readonly schema: Schema;
  readonly getState: () => EditorState | undefined;
  readonly dispatch: Dispatch;
  readonly load: (doc: Doc, version: number) => void;
}
