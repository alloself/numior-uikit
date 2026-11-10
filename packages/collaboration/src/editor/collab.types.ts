import type {
  AttrValue,
  Dispatch,
  Doc,
  EditorState,
  NodeId,
  Schema,
  Step,
  StepMap,
} from '@numior/editor-core';
import type { CollabAlternative } from '../client/client.types';
import type { PresenceUser } from './presence.types';

export interface UnconfirmedStep {
  readonly step: Step;
  readonly inverted: Step;
}

export interface CollabState {
  readonly version: number;
  readonly unconfirmed: readonly UnconfirmedStep[];
  readonly trail: readonly StepMap[];
}

export interface CollabProgress {
  readonly version: number;
  readonly pending: number;
}

export interface CollabOptions {
  readonly version?: number | undefined;
  readonly unconfirmed?: readonly UnconfirmedStep[] | undefined;
}

export interface AttrWrite {
  readonly nodeId: NodeId;
  readonly attr: string;
  readonly value: AttrValue;
}

export interface AttrConflict extends AttrWrite {
  readonly index: number;
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
  readonly authorOf?: ((clientId: string) => PresenceUser | undefined) | undefined;
  readonly onAlternatives?: ((found: readonly CollabAlternative[]) => void) | undefined;
}
