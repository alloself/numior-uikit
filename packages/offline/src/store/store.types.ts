import type { WireStep } from '@numior/collaboration';
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

export interface OfflineState {
  readonly meta: OfflineMeta;
  readonly snapshot: OfflineSnapshot;
  readonly steps: readonly OfflineStep[];
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
  appendSteps(steps: readonly OfflineStep[]): Promise<void>;
  compact(): Promise<boolean>;
  close(): void;
}
