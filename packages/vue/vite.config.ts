import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';

const packageRoot = new URL('./', import.meta.url);
const RELATIVE_IMPORT = /^@import\s+['"](\.{1,2}\/[^'"]+\.css)['"]\s*;\s*$/;

/** Inline relative @import lines so a stylesheet becomes self-contained. */
async function inlineCss(file: URL, seen = new Set<string>()): Promise<string> {
  const output: string[] = [];
  for (const line of (await readFile(file, 'utf8')).split('\n')) {
    const match = RELATIVE_IMPORT.exec(line);
    if (!match) {
      output.push(line);
      continue;
    }
    const target = new URL(match[1]!, file);
    if (seen.has(target.href)) continue;
    seen.add(target.href);
    output.push(await inlineCss(target, seen));
  }
  return output.join('\n');
}

/**
 * CSS stays opt-in: nothing imports it from JavaScript. The build emits the LICENSE, a flat
 * styles.css with every component, and one standalone stylesheet per component under styles/.
 */
function explicitCss(): Plugin {
  return {
    name: 'explicit-css',
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'LICENSE',
        source: await readFile(new URL('../../LICENSE', packageRoot), 'utf8'),
      });
      const manifest = new URL('./src/styles.css', packageRoot);
      this.emitFile({ type: 'asset', fileName: 'styles.css', source: await inlineCss(manifest) });
      for (const line of (await readFile(manifest, 'utf8')).split('\n')) {
        const match = RELATIVE_IMPORT.exec(line);
        if (!match) continue;
        const target = new URL(match[1]!, manifest);
        const name = target.pathname.slice(target.pathname.lastIndexOf('/') + 1);
        this.emitFile({
          type: 'asset',
          fileName: `styles/${name}`,
          source: await inlineCss(target),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [vue(), explicitCss()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
    },
    sourcemap: true,
    // Externals keep a single copy of the primitives' injection keys in every app.
    rolldownOptions: { external: ['vue', '@numior/primitives', 'lucide-vue-next'] },
  },
});
