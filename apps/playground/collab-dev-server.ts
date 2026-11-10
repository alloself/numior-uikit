import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite-plus';

const SERVER = fileURLToPath(
  new URL('../../packages/collaboration/server/reference-server.ts', import.meta.url),
);

const DEFAULT_PORT = 4175;

const PORT = Number(process.env.COLLAB_PORT ?? DEFAULT_PORT);

export const collabDevServer = (): Plugin => ({
  name: 'numior:collab-dev-server',
  apply: 'serve',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: { name: 'nui-collab-port', content: String(PORT) },
      injectTo: 'head',
    },
  ],
  configureServer: (server) => {
    const start = async (): Promise<void> => {
      try {
        const { startReferenceServer } = await server.ssrLoadModule(SERVER);

        const running = await startReferenceServer(PORT, (error: unknown) => {
          server.config.logger.error(`  Collaboration room failed: ${String(error)}`);
        });

        server.httpServer?.once('close', () => {
          void running.close();
        });

        server.config.logger.info(`  Collaboration server on ws://localhost:${String(PORT)}`);
      } catch (error) {
        server.config.logger.warn(`  Collaboration server did not start: ${String(error)}`);
      }
    };

    server.httpServer?.once('listening', () => {
      void start();
    });
  },
});
