import type { Doc, DocJSON, IdSource, Plugin, Schema } from '@numior/editor-core';
import type { NuiEditorApi } from '@numior/editor-vue';
import type { ComputedRef, Ref, ShallowRef } from 'vue';
import type { NuiCollabMessages } from './collab.messages';
import type { CollabPersistence, CollabStatus, CollabTransport } from '../client/client.types';
import type { CommentReply, CommentThread, CommentsAdapter } from '../comments/comments.types';
import type { DocumentVersion, HistoryAdapter } from '../history/history.types';
import type { PresenceUser, RemotePeer } from '../editor/presence.types';

export interface UseCollabEditorOptions {
  readonly doc: string;
  readonly user: PresenceUser;
  readonly schema: Schema;
  readonly transport: CollabTransport;
  readonly editor: () => NuiEditorApi | undefined;
  readonly persistence?: CollabPersistence | undefined;
}

export interface CollabEditor {
  readonly ready: Readonly<Ref<boolean>>;
  readonly document: ShallowRef<DocJSON | undefined>;
  readonly plugins: Readonly<ShallowRef<readonly Plugin[]>>;
  readonly ids: Readonly<ShallowRef<IdSource | undefined>>;
  readonly peers: Readonly<ShallowRef<readonly RemotePeer[]>>;
  readonly status: Readonly<ShallowRef<CollabStatus>>;
}

export interface NuiCollabCaretsProps {
  peers: readonly RemotePeer[];
  editor?: NuiEditorApi | undefined;
}

export interface NuiCollabPresenceProps {
  peers: readonly RemotePeer[];
  max?: number | undefined;
  label?: string | undefined;
}

export interface UseEditorCommentsOptions {
  readonly doc: string;
  readonly user: PresenceUser;
  readonly adapter: CommentsAdapter;
  readonly editor: () => NuiEditorApi | undefined;
}

export interface CommentThreadView extends CommentThread {
  readonly lost: boolean;
}

export interface CollabComments {
  readonly plugin: Plugin;
  readonly user: PresenceUser;
  readonly threads: ComputedRef<readonly CommentThreadView[]>;
  readonly active: Readonly<ShallowRef<string | undefined>>;
  readonly drafting: Readonly<Ref<boolean>>;
  readonly canAdd: Readonly<Ref<boolean>>;
  readonly failed: Readonly<Ref<boolean>>;
  readonly start: () => void;
  readonly cancel: () => void;
  readonly submit: (body: string) => Promise<boolean>;
  readonly reply: (id: string, body: string) => Promise<boolean>;
  readonly resolve: (id: string, resolved: boolean) => Promise<void>;
  readonly remove: (id: string) => Promise<void>;
  readonly activate: (id: string) => void;
}

export interface UseEditorHistoryOptions {
  readonly doc: string;
  readonly user: PresenceUser;
  readonly adapter: HistoryAdapter;
  readonly editor: () => NuiEditorApi | undefined;
}

export interface CollabHistory {
  readonly versions: ComputedRef<readonly DocumentVersion[]>;
  readonly selected: Readonly<ShallowRef<string | undefined>>;
  readonly preview: ComputedRef<Doc | undefined>;
  readonly changes: ComputedRef<number | undefined>;
  readonly comparing: Readonly<Ref<boolean>>;
  readonly compare: (value: boolean) => void;
  readonly loading: Readonly<Ref<boolean>>;
  readonly failed: Readonly<Ref<boolean>>;
  readonly canSave: boolean;
  readonly open: (id: string) => Promise<void>;
  readonly close: () => void;
  readonly save: (label?: string) => Promise<void>;
  readonly restore: () => void;
}

export interface NuiEditorHistoryProps {
  history: CollabHistory;
  labels?: Partial<Omit<NuiCollabMessages, 'present'>> | undefined;
}

export interface NuiEditorVersionPreviewProps {
  history: CollabHistory;
  text: NuiCollabMessages;
}

export interface NuiEditorCommentFormProps {
  placeholder: string;
  text: NuiCollabMessages;
  submit: (body: string) => Promise<boolean>;
}

export interface NuiEditorCommentEntryProps {
  entry: CommentReply;
  timeOf: (value: string) => string;
}

export interface NuiEditorCommentThreadProps {
  comments: CollabComments;
  thread: CommentThreadView;
  text: NuiCollabMessages;
  timeOf: (value: string) => string;
}

export interface NuiEditorCommentsProps {
  comments: CollabComments;
  labels?: Partial<Omit<NuiCollabMessages, 'present'>> | undefined;
}
