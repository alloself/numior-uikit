import { contentSchema } from '@numior/content';
import { createEmptyDoc } from '@numior/editor-core';
import { editorAuthority } from './authority.ts';
import { startCollabServer } from './server.ts';

const DEFAULT_PORT = 4175;

const port = Number(process.env.COLLAB_PORT ?? DEFAULT_PORT);

await startCollabServer({
  port,
  authorityFor: () => editorAuthority(createEmptyDoc(contentSchema)),
});

process.stdout.write(`Collaboration server on ws://localhost:${port}\n`);
