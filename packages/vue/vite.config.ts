import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';

const packageRoot = new URL('./', import.meta.url);
const RELATIVE_IMPORT = /^@import\s+['"](\.{1,2}\/[^'"]+\.css)['"]\s*;\s*$/;

function importTarget(line: string, from: URL): URL | null {
  const [, specifier = ''] = RELATIVE_IMPORT.exec(line) ?? [];
  return specifier ? new URL(specifier, from) : null;
}

async function inlineCss(file: URL, seen = new Set<string>()): Promise<string> {
  const output: string[] = [];
  for (const line of (await readFile(file, 'utf8')).split('\n')) {
    const target = importTarget(line, file);
    if (!target) {
      output.push(line);
      continue;
    }
    if (seen.has(target.href)) continue;
    seen.add(target.href);
    output.push(await inlineCss(target, seen));
  }
  return output.join('\n');
}

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
        const target = importTarget(line, manifest);
        if (!target) continue;
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
    rolldownOptions: { external: [/^vue$/, /^@numior\/primitives$/, /^lucide-vue-next(\/|$)/] },
  },
});
