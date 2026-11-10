import type { NodeId } from '@numior/editor-core';

export interface PresenceUser {
  readonly id: string;
  readonly name: string;
  readonly avatar?: string | undefined;
}

export interface BlockPoint {
  readonly block: NodeId;
  readonly offset: number;
}

export interface PresenceSelection {
  readonly anchor: BlockPoint;
  readonly head: BlockPoint;
}

export interface EditorPresence {
  readonly user: PresenceUser;
  readonly selection: PresenceSelection | null;
  readonly version?: number | undefined;
}

export interface RemotePeer {
  readonly clientId: string;
  readonly user: PresenceUser;
  readonly colour: number;
  readonly anchor: number | undefined;
  readonly head: number | undefined;
}
