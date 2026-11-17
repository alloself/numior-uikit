import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

export interface KitStylesOptions {
  readonly src: URL;
  readonly packages: URL;
}

interface KitSheet {
  readonly fileName: string;
  readonly source: string;
}

const FORWARD = /^@import '@numior\/([a-z-]+)\/styles\.css';$/mu;
const RELATIVE_IMPORT = /^@import\s+['"]\.{1,2}\/[^'"]*?([^/'"]+\.css)['"]\s*;\s*$/u;
const COMPONENT_SHEETS = './styles/*.css';
const BUNDLE = /styles\.css$/u;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

const exportsComponentSheets = async (packageDir: URL): Promise<boolean> => {
  const manifest: unknown = JSON.parse(await readFile(new URL('package.json', packageDir), 'utf8'));
  const exports = isRecord(manifest) ? manifest.exports : undefined;

  return isRecord(exports) && COMPONENT_SHEETS in exports;
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

const sheetsOf = async (file: string, source: string, packages: URL): Promise<KitSheet[]> => {
  const [, name] = FORWARD.exec(source) ?? [];
  const bundle = { fileName: file, source };

  if (name === undefined) {
    return [bundle];
  }
  const folder = file.replace(BUNDLE, 'styles/');

  const forwards = (await componentSheets(new URL(`${name}/`, packages))).map((sheet) => ({
    fileName: `${folder}${sheet}`,
    source: `@import '@numior/${name}/styles/${sheet}';\n`,
  }));

  return [bundle, ...forwards];
};

export const kitStyles = ({ src, packages }: KitStylesOptions): Plugin => ({
  name: 'kit-styles',
  async generateBundle() {
    for await (const file of glob('**/*.css', { cwd: fileURLToPath(src) })) {
      const source = await readFile(new URL(file, src), 'utf8');

      for (const sheet of await sheetsOf(file, source, packages)) {
        this.emitFile({ type: 'asset', ...sheet });
      }
    }
  },
});
