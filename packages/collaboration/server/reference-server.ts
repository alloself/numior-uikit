import { contentSchema } from '@numior/content';
import { createEmptyDoc } from '@numior/editor-core';
import { workbookAuthority } from '@numior/spreadsheet/core';
import { editorAuthority } from './authority.ts';
import { startCollabServer, type CollabServer } from './server.ts';

const BOOK_PREFIX = 'book';

export const startReferenceServer = (
  port: number,
  onError?: (error: unknown) => void,
): Promise<CollabServer> =>
  startCollabServer({
    port,
    onError,
    authorityFor: (doc) =>
      doc.startsWith(BOOK_PREFIX)
        ? workbookAuthority([{ kind: 'addSheet', name: 'Sheet1', index: 0 }])
        : editorAuthority(createEmptyDoc(contentSchema)),
  });
