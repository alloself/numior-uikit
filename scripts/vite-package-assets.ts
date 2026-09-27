import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';

interface PackageAssetsOptions {
  readonly root: URL;
  readonly styles?: string;
}

const RELATIVE_IMPORT = /^@import\s+['"](\.{1,2}\/[^'"]+\.css)['"]\s*;\s*$/;

const importTarget = (line: string, from: URL): URL | null => {
  const [, specifier = ''] = RELATIVE_IMPORT.exec(line) ?? [];
  return specifier ? new URL(specifier, from) : null;
};

export const inlineCss = async (file: URL, seen = new Set<string>()): Promise<string> => {
  const output: string[] = [];

  for (const line of (await readFile(file, 'utf8')).split('\n')) {
    const target = importTarget(line, file);

    if (!target) {
      output.push(line);
      continue;
    }

    if (seen.has(target.href)) {
      continue;
    }

    seen.add(target.href);
    output.push(await inlineCss(target, seen));
  }

  return output.join('\n');
};

export const packageAssets = ({ root, styles }: PackageAssetsOptions): Plugin => ({
  name: 'package-assets',
  async generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'LICENSE',
      source: await readFile(new URL('../../LICENSE', root), 'utf8'),
    });

    if (styles === undefined) {
      return;
    }

    const manifest = new URL(styles, root);

    this.emitFile({ type: 'asset', fileName: 'styles.css', source: await inlineCss(manifest) });

    for (const line of (await readFile(manifest, 'utf8')).split('\n')) {
      const target = importTarget(line, manifest);

      if (!target) {
        continue;
      }

      const name = target.pathname.slice(target.pathname.lastIndexOf('/') + 1);

      this.emitFile({
        type: 'asset',
        fileName: `styles/${name}`,
        source: await inlineCss(target),
      });
    }
  },
});
