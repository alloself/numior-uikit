import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite-plus';

const SERVER = fileURLToPath(
  new URL('../../packages/collaboration/server/reference-server.ts', import.meta.url),
);

const PORT = 4175;

export const collabDevServer = (): Plugin => ({
  name: 'numior:collab-dev-server',
  apply: 'serve',
  configureServer: (server) => {
    const start = async (): Promise<void> => {
      try {
        const { startReferenceServer } = await server.ssrLoadModule(SERVER);
        const running = await startReferenceServer(PORT);

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
