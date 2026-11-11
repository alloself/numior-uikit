import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  encodeScene,
  imageFile,
  readScene,
  sceneFile,
  sceneNames,
  styleOf,
  writeScene,
} from './store';
import type { StoredScene } from './parity.types';

const PROPERTIES = ['color', 'display'];
const IMAGE = Uint8Array.from([1, 2, 3]);

const directories: string[] = [];

const directory = async (): Promise<string> => {
  const created = await mkdtemp(join(tmpdir(), 'parity-store-'));

  directories.push(created);
  return created;
};

const scene = (name: string): StoredScene =>
  encodeScene(
    name,
    PROPERTIES,
    {
      values: ['rgb(0, 0, 0)', 'block', 'rgb(255, 0, 0)'],
      nodes: [
        [-1, 'section.panel:0', '0 0 800 200', [0, 1]],
        [0, 'p:0', '0 0 800 20', [0, 1]],
        [0, 'button.nui-button:1', '0 20 96 32', [2, 1]],
      ],
    },
    [['button.nui-button:1', 'opacity 120ms']],
  );

const store = async (root: string, name: string, content: unknown): Promise<void> => {
  const file = sceneFile(root, name);

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, gzipSync(JSON.stringify(content)));
};

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((created) => rm(created, { recursive: true, force: true })),
  );
});

describe('scene store', () => {
  it('writes a scene with its image and reads the same scene back', async () => {
    const root = await directory();
    const taken = scene('pg-light-1440/buttons');

    await writeScene(root, taken, IMAGE);

    const restored = await readScene(root, 'pg-light-1440/buttons');

    expect(restored).toEqual(taken);
    expect(Array.from(await readFile(imageFile(root, 'pg-light-1440/buttons')))).toEqual([1, 2, 3]);

    expect(restored.nodes.map((node) => styleOf(restored, node))).toEqual([
      ['rgb(0, 0, 0)', 'block'],
      ['rgb(0, 0, 0)', 'block'],
      ['rgb(255, 0, 0)', 'block'],
    ]);
  });

  it('keeps only the values of a node that differ from the most common ones', () => {
    const taken = scene('pg-light-1440/buttons');

    expect(taken.modes).toEqual([0, 1]);
    expect(taken.nodes.map(([, , , own]) => own)).toEqual([[], [], [0, 2]]);
  });

  it('lists the scenes of every profile in a stable order', async () => {
    const root = await directory();

    await writeScene(root, scene('pg-light-1440/select'), IMAGE);
    await writeScene(root, scene('pg-dark-1440/states/dialog'), IMAGE);
    await writeScene(root, scene('pg-light-1440/buttons'), IMAGE);

    expect(await sceneNames(root)).toEqual([
      'pg-dark-1440/states/dialog',
      'pg-light-1440/buttons',
      'pg-light-1440/select',
    ]);
  });

  it('refuses a file that is not a stored scene', async () => {
    const root = await directory();
    const { notes, ...withoutNotes } = scene('pg-light-1440/buttons');

    await store(root, 'list', [notes]);
    await store(root, 'unnamed', { ...withoutNotes, notes, name: 7 });
    await store(root, 'no-notes', withoutNotes);

    await expect(readScene(root, 'list')).rejects.toThrow('Not a parity scene: list');
    await expect(readScene(root, 'unnamed')).rejects.toThrow('Not a parity scene: unnamed');
    await expect(readScene(root, 'no-notes')).rejects.toThrow('Not a parity scene: no-notes');
  });
});
