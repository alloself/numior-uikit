import type { DocJSON } from '@numior/editor-core';
import type { PresenceUser } from '../editor/presence.types';

export interface DocumentVersion {
  readonly id: string;
  readonly author: PresenceUser;
  readonly createdAt: string;
  readonly label?: string | undefined;
}

export interface NewDocumentVersion {
  readonly document: DocJSON;
  readonly author: PresenceUser;
  readonly label?: string | undefined;
}

export interface HistoryAdapter {
  versions(doc: string, signal: AbortSignal): Promise<readonly DocumentVersion[]>;
  load(doc: string, id: string, signal: AbortSignal): Promise<DocJSON>;
  save?(doc: string, version: NewDocumentVersion): Promise<DocumentVersion>;
}
