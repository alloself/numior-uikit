import type { AnchorJSON } from '@numior/editor-core';
import type { PresenceUser } from '../editor/presence.types';

export type CommentAnchor = AnchorJSON;

export interface CommentReply {
  readonly id: string;
  readonly author: PresenceUser;
  readonly body: string;
  readonly createdAt: string;
}

export interface CommentThread {
  readonly id: string;
  readonly anchor: CommentAnchor;
  readonly author: PresenceUser;
  readonly body: string;
  readonly createdAt: string;
  readonly resolved: boolean;
  readonly replies: readonly CommentReply[];
}

export interface NewComment {
  readonly anchor: CommentAnchor;
  readonly author: PresenceUser;
  readonly body: string;
}

export interface NewReply {
  readonly author: PresenceUser;
  readonly body: string;
}

export type CommentEvent =
  | { readonly kind: typeof CommentEventKind.Changed; readonly thread: CommentThread }
  | { readonly kind: typeof CommentEventKind.Removed; readonly id: string };

export interface CommentsAdapter {
  list(doc: string, signal: AbortSignal): Promise<readonly CommentThread[]>;
  create(doc: string, comment: NewComment): Promise<CommentThread>;
  reply(doc: string, threadId: string, reply: NewReply): Promise<CommentThread>;
  resolve(doc: string, threadId: string, resolved: boolean): Promise<CommentThread>;
  remove(doc: string, threadId: string): Promise<void>;
  move?(doc: string, threadId: string, anchor: CommentAnchor): Promise<void>;
  subscribe?(doc: string, listener: (event: CommentEvent) => void): () => void;
}

export const CommentEventKind = { Changed: 'changed', Removed: 'removed' } as const;
