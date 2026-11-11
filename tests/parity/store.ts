import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import type { Note, RawScene, StoredNode, StoredScene } from './parity.types.ts';

const SCENE_SUFFIX = '.json.gz';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStoredScene = (value: unknown): value is StoredScene =>
  isRecord(value) &&
  typeof value.name === 'string' &&
  Array.isArray(value.properties) &&
  Array.isArray(value.values) &&
  Array.isArray(value.modes) &&
  Array.isArray(value.nodes) &&
  Array.isArray(value.notes);

const modeOf = (counts: ReadonlyMap<number, number>): number => {
  let best = 0;
  let bestCount = -1;

  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });

  return best;
};

const modesOf = (scene: RawScene, width: number): number[] => {
  const counts = Array.from({ length: width }, () => new Map<number, number>());

  scene.nodes.forEach(([, , , style]) => {
    style.forEach((value, property) => {
      const column = counts[property];

      column?.set(value, (column.get(value) ?? 0) + 1);
    });
  });

  return counts.map(modeOf);
};

export const encodeScene = (
  name: string,
  properties: readonly string[],
  scene: RawScene,
  notes: readonly Note[] = [],
): StoredScene => {
  const modes = modesOf(scene, properties.length);

  const nodes = scene.nodes.map(([parent, segment, rect, style]): StoredNode => {
    const own = style.reduce<number[]>((pairs, value, property) => {
      if (value !== modes[property]) {
        pairs.push(property, value);
      }
      return pairs;
    }, []);

    return [parent, segment, rect, own];
  });

  return { name, properties, values: scene.values, modes, nodes, notes };
};

export const styleOf = (scene: StoredScene, node: StoredNode): string[] => {
  const indexes = [...scene.modes];
  const own = node[3];

  for (let at = 0; at < own.length; at += 2) {
    indexes[own[at] ?? 0] = own[at + 1] ?? 0;
  }

  return indexes.map((index) => scene.values[index] ?? '');
};

export const sceneFile = (directory: string, name: string): string =>
  join(directory, `${name}${SCENE_SUFFIX}`);

export const imageFile = (directory: string, name: string): string =>
  join(directory, `${name}.png`);

export const writeScene = async (
  directory: string,
  scene: StoredScene,
  image: Uint8Array,
): Promise<void> => {
  const file = sceneFile(directory, scene.name);

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, gzipSync(JSON.stringify(scene)));
  await writeFile(imageFile(directory, scene.name), image);
};

export const readScene = async (directory: string, name: string): Promise<StoredScene> => {
  const parsed: unknown = JSON.parse(
    gunzipSync(await readFile(sceneFile(directory, name))).toString('utf8'),
  );

  if (!isStoredScene(parsed)) {
    throw new Error(`Not a parity scene: ${name}`);
  }
  return parsed;
};

export const sceneNames = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });

  return entries
    .reduce<string[]>((names, entry) => {
      if (entry.isFile() && entry.name.endsWith(SCENE_SUFFIX)) {
        const file = join(entry.parentPath, entry.name.slice(0, -SCENE_SUFFIX.length));

        names.push(relative(directory, file));
      }
      return names;
    }, [])
    .toSorted();
};
