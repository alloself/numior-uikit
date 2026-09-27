import type { Plugin } from 'vitepress';
import type { Highlighter } from 'shiki';
import { loadVirtualModule, resolveVirtualId } from './modules.ts';

export const docsExamples = (root: string, highlighter: Highlighter): Plugin => ({
  name: 'nui-docs-examples',
  resolveId: resolveVirtualId,
  load(id) {
    return loadVirtualModule(root, highlighter, id, (file) => this.addWatchFile(file));
  },
});
