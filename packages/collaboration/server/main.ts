import { contentSchema } from '@numior/content';
import { createEmptyDoc } from '@numior/editor-core';
import { workbookAuthority } from '@numior/spreadsheet/core';
import { editorAuthority } from './authority.ts';
import { startCollabServer } from './server.ts';

const DEFAULT_PORT = 4175;

const BOOK_PREFIX = 'book';

const port = Number(process.env.COLLAB_PORT ?? DEFAULT_PORT);

await startCollabServer({
  port,
  authorityFor: (doc) =>
    doc.startsWith(BOOK_PREFIX)
      ? workbookAuthority([{ kind: 'addSheet', name: 'Sheet1', index: 0 }])
      : editorAuthority(createEmptyDoc(contentSchema)),
});

process.stdout.write(`Collaboration server on ws://localhost:${port}\n`);
