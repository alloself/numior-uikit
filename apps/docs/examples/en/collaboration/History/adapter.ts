import type { DocumentVersion, HistoryAdapter } from '@numior/collaboration';
import type { DocJSON } from '@numior/editor-core';

export interface StoredVersion {
  readonly version: DocumentVersion;
  readonly document: DocJSON;
}

const newId = (): string => Math.random().toString(36).slice(2, 10);

export const memoryHistory = (initial: readonly StoredVersion[]): HistoryAdapter => {
  let stored = initial;

  return {
    versions: () => Promise.resolve(stored.map((entry) => entry.version)),
    load: (_doc, id) => {
      const found = stored.find((entry) => entry.version.id === id);

      return found === undefined
        ? Promise.reject(new Error('The version is gone'))
        : Promise.resolve(found.document);
    },
    save: (_doc, { document, author, label }) => {
      const version = { id: newId(), author, label, createdAt: new Date().toISOString() };

      stored = [...stored, { version, document }];
      return Promise.resolve(version);
    },
  };
};
