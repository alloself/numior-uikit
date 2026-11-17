import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

export interface KitStylesOptions {
  readonly src: URL;
  readonly packages: URL;
}

const FORWARD = /^@import '@numior\/([a-z-]+)\/styles\.css';$/mu;
const RELATIVE_IMPORT = /^@import\s+['"]\.{1,2}\/[^'"]*?([^/'"]+\.css)['"]\s*;\s*$/u;
const COMPONENT_SHEETS = './styles/*.css';

const forward = (specifier: string): string => `@import '${specifier}';\n`;

const exportsComponentSheets = async (packageDir: URL): Promise<boolean> => {
  const manifest: unknown = JSON.parse(await readFile(new URL('package.json', packageDir), 'utf8'));

  return (
    typeof manifest === 'object' &&
    manifest !== null &&
    'exports' in manifest &&
    typeof manifest.exports === 'object' &&
    manifest.exports !== null &&
    COMPONENT_SHEETS in manifest.exports
  );
};

const componentSheets = async (packageDir: URL): Promise<string[]> => {
  if (!(await exportsComponentSheets(packageDir))) {
    return [];
  }

  const manifest = await readFile(new URL('src/styles.css', packageDir), 'utf8');

  return manifest.split('\n').flatMap((line) => {
    const [, file] = RELATIVE_IMPORT.exec(line) ?? [];

    return file === undefined ? [] : [file];
  });
};

export const kitStyles = ({ src, packages }: KitStylesOptions): Plugin => ({
  name: 'kit-styles',
  async generateBundle() {
    const root = fileURLToPath(src);

    for await (const file of glob('**/*.css', { cwd: root })) {
      const source = await readFile(new URL(file, src), 'utf8');
      const [, name] = FORWARD.exec(source) ?? [];
      const folder = relative('.', file).replace(/styles\.css$/u, '');

      this.emitFile({ type: 'asset', fileName: file, source });

      if (name === undefined) {
        continue;
      }

      for (const sheet of await componentSheets(new URL(`${name}/`, packages))) {
        this.emitFile({
          type: 'asset',
          fileName: `${folder}styles/${sheet}`,
          source: forward(`@numior/${name}/styles/${sheet}`),
        });
      }
    }
  },
});
