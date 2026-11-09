import type { DocJSON, IdSource, Plugin, Schema } from '@numior/editor-core';
import type { NuiEditorApi } from '@numior/editor-vue';
import type { Ref, ShallowRef } from 'vue';
import type { CollabStatus, CollabTransport } from '../client/client.types';
import type { PresenceUser, RemotePeer } from '../editor/presence.types';

export interface UseCollabEditorOptions {
  readonly doc: string;
  readonly user: PresenceUser;
  readonly schema: Schema;
  readonly transport: CollabTransport;
  readonly editor: () => NuiEditorApi | undefined;
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
