import { startReferenceServer } from './reference-server.ts';

const DEFAULT_PORT = 4175;

const port = Number(process.env.COLLAB_PORT ?? DEFAULT_PORT);

await startReferenceServer(port);

process.stdout.write(`Collaboration server on ws://localhost:${port}\n`);
