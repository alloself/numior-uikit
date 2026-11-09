import type { CollabAlternative, WireStep } from '@numior/collaboration';
import type { DocJSON, Schema } from '@numior/editor-core';

export type OfflinePlugins = Readonly<Record<string, number>>;

export interface OfflineMeta {
  readonly schema: { readonly name: string; readonly version: number };
  readonly plugins: OfflinePlugins;
}

export interface OfflineSnapshot {
  readonly version: number;
  readonly document: DocJSON;
}

export interface OfflineStep {
  readonly version: number;
  readonly step: WireStep;
}

export interface OfflineOutbox {
  readonly clientId: string;
  readonly baseVersion: number;
  readonly steps: readonly WireStep[];
}

export interface OfflineState {
  readonly meta: OfflineMeta;
  readonly snapshot: OfflineSnapshot;
  readonly steps: readonly OfflineStep[];
  readonly outbox: OfflineOutbox | undefined;
  readonly alternatives: readonly CollabAlternative[];
}

export interface OfflineStoreOptions {
  readonly schema: Schema;
  readonly plugins?: OfflinePlugins | undefined;
  readonly factory?: IDBFactory | undefined;
  readonly compactAfter?: number | undefined;
}

export interface OfflineStore {
  read(): Promise<OfflineState | undefined>;
  writeSnapshot(snapshot: OfflineSnapshot): Promise<void>;
  appendSteps(
    steps: readonly OfflineStep[],
    outbox?: OfflineOutbox,
    alternatives?: readonly CollabAlternative[],
  ): Promise<void>;
  removeAlternative(alternative: CollabAlternative): Promise<void>;
  compact(): Promise<boolean>;
  close(): void;
}

export interface OfflineLocks {
  request(
    name: string,
    options: { readonly ifAvailable: boolean },
    callback: (lock: unknown) => Promise<void> | undefined,
  ): Promise<unknown>;
}

export interface OfflinePersistenceOptions extends OfflineStoreOptions {
  readonly locks?: OfflineLocks | undefined;
  readonly onError?: ((error: unknown) => void) | undefined;
}
