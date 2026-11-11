import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';

interface PackageAssetsOptions {
  readonly root: URL;
  readonly styles?: string;
  readonly bundled?: readonly string[];
}

type Emit = (file: { type: 'asset'; fileName: string; source: string }) => unknown;

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

const emitLicenses = async (emit: Emit, root: URL, bundled: readonly string[]): Promise<void> => {
  emit({
    type: 'asset',
    fileName: 'LICENSE',
    source: await readFile(new URL('../../LICENSE', root), 'utf8'),
  });

  for (const name of bundled) {
    emit({
      type: 'asset',
      fileName: `LICENSE-${name.replace(/^@/, '').replace('/', '-')}`,
      source: await readFile(new URL(`node_modules/${name}/LICENSE`, root), 'utf8'),
    });
  }
};

const emitStyles = async (emit: Emit, manifest: URL): Promise<void> => {
  emit({ type: 'asset', fileName: 'styles.css', source: await inlineCss(manifest) });

  for (const line of (await readFile(manifest, 'utf8')).split('\n')) {
    const target = importTarget(line, manifest);

    if (!target) {
      continue;
    }

    const name = target.pathname.slice(target.pathname.lastIndexOf('/') + 1);

    emit({ type: 'asset', fileName: `styles/${name}`, source: await inlineCss(target) });
  }
};

export const packageAssets = ({ root, styles, bundled = [] }: PackageAssetsOptions): Plugin => ({
  name: 'package-assets',
  async generateBundle() {
    const emit: Emit = (file) => this.emitFile(file);

    await emitLicenses(emit, root, bundled);

    if (styles === undefined) {
      return;
    }

    await emitStyles(emit, new URL(styles, root));
  },
});
