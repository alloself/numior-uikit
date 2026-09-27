import type { Plugin } from 'vitepress';
import type { Highlighter } from 'shiki';
import { isRegistryId, loadVirtualModule, resolveVirtualId } from './modules.ts';

export const docsExamples = (root: string, highlighter: Highlighter): Plugin => ({
  name: 'nui-docs-examples',
  resolveId: resolveVirtualId,
  load(id) {
    return loadVirtualModule(root, highlighter, id, (file) => this.addWatchFile(file));
  },
  configureServer(server) {
    const refresh = (file: string): void => {
      if (!file.startsWith(root)) {
        return;
      }
      for (const [id, module] of server.moduleGraph.idToModuleMap) {
        if (isRegistryId(id)) {
          server.moduleGraph.invalidateModule(module);
        }
      }
      server.ws.send({ type: 'full-reload' });
    };

    server.watcher.add(root);
    server.watcher.on('add', refresh);
    server.watcher.on('unlink', refresh);
  },
});
