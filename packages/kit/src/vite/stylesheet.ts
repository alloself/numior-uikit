import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { isEqual } from 'lodash-es';
import { namesIn, namesInFiles, projectSource, sourceFiles, textOf } from './scan';
import { knownNames, sheetImports, usedSheets } from './styles';
import type { KitManifest, KitStylesheet, ScanSource } from './vite.types';

const CSS_FILE = /\.css$/u;
const NODE_MODULES = '/node_modules/';

const isSource = (file: string): boolean => !CSS_FILE.test(file) && !file.includes(NODE_MODULES);

export const createStylesheet = (
  manifest: KitManifest,
  root: string,
  path: string,
): KitStylesheet => {
  const known = knownNames(manifest);
  let extra: readonly ScanSource[] = [];
  let used: Promise<Set<string>> | undefined;
  let written: Promise<void> | undefined;

  const scan = (): Promise<Set<string>> =>
    namesInFiles(sourceFiles([projectSource(root), ...extra]), known);

  const usedNames = (): Promise<Set<string>> => {
    used ??= scan();
    return used;
  };

  const write = async (): Promise<void> => {
    const text = sheetImports(usedSheets(manifest, await usedNames()));

    if ((await textOf(path)) === text) {
      return;
    }
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, text);
  };

  return {
    path,
    ready: () => {
      written ??= write();
      return written;
    },
    grow: async (file) => {
      if (!isSource(file)) {
        return false;
      }
      const current = await usedNames();
      const added = namesIn(await textOf(file), known).filter((name) => !current.has(name));

      if (added.length === 0) {
        return false;
      }
      for (const name of added) {
        current.add(name);
      }
      written = write();
      await written;

      return true;
    },
    include: async (sources) => {
      if (isEqual(sources, extra)) {
        return false;
      }
      await written;
      extra = sources;

      const before = await usedNames();

      used = scan();

      if (isEqual(await used, before)) {
        return false;
      }
      written = write();
      await written;

      return true;
    },
  };
};
