import type { DocumentVersion, HistoryAdapter } from '@numior/collaboration';
import type { DocJSON } from '@numior/editor-core';

const newId = (): string => Math.random().toString(36).slice(2, 10);

export const fakeHistory = (): HistoryAdapter => {
  const documents = new Map<string, DocJSON>();
  let versions: readonly DocumentVersion[] = [];

  return {
    versions: () => Promise.resolve(versions),
    load: (_doc, id) => {
      const document = documents.get(id);

      return document === undefined
        ? Promise.reject(new Error('The version is gone'))
        : Promise.resolve(document);
    },
    save: (_doc, { document, author, label }) => {
      const version = { id: newId(), author, label, createdAt: new Date().toISOString() };

      documents.set(version.id, document);
      versions = [...versions, version];
      return Promise.resolve(version);
    },
  };
};
