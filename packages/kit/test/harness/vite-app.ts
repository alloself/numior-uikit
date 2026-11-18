import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { build, createServer, type Rollup } from 'vite';
import { kitPlugins } from '../../src/vite/index';
import { readManifest } from '../../src/vite/manifest';
import type { NumiorOptions } from '../../src/vite/vite.types';

export interface BuiltApp {
  readonly css: string;
  readonly js: string;
}

export interface DevApp {
  readonly styles: () => Promise<string>;
  readonly add: (file: string, text: string) => Promise<void>;
  readonly close: () => Promise<void>;
}

const FIXTURE = fileURLToPath(new URL('../vite-fixture/', import.meta.url));
const DECODER = new TextDecoder();

const isOutput = (value: unknown): value is Rollup.RollupOutput =>
  typeof value === 'object' && value !== null && 'output' in value;

const textOf = (part: Rollup.OutputAsset | Rollup.OutputChunk): string => {
  if (part.type === 'chunk') {
    return part.code;
  }
  return typeof part.source === 'string' ? part.source : DECODER.decode(part.source);
};

const joined = (parts: readonly (Rollup.OutputAsset | Rollup.OutputChunk)[], extension: string) =>
  parts
    .reduce<string[]>((texts, part) => {
      if (part.fileName.endsWith(extension)) {
        texts.push(textOf(part));
      }
      return texts;
    }, [])
    .join('\n');

const buildApp = async (root: string, options: NumiorOptions = {}): Promise<BuiltApp> => {
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [vue(), ...kitPlugins(readManifest(), options)],
    build: {
      write: false,
      minify: false,
      rolldownOptions: { input: join(root, 'src/main.ts') },
    },
  });

  const output = isOutput(result) ? result.output : [];

  return { css: joined(output, '.css'), js: joined(output, '.js') };
};

export const buildFixture = (options: NumiorOptions = {}): Promise<BuiltApp> =>
  buildApp(FIXTURE, options);

const SHARED_APP = [
  '<template><NuiBadge>3</NuiBadge><Orders /></template>',
  '<script setup lang="ts">',
  "import Orders from '../../shared/Orders.vue';",
  '</script>',
].join('\n');

const SHARED_ORDERS = '<template><NuiTable :rows="[]" :columns="[]" /></template>';

export const buildWithSharedFolder = async (entryTail: string): Promise<BuiltApp> => {
  const top = await mkdtemp(join(tmpdir(), 'numior-kit-shared-'));

  await mkdir(join(top, 'app/src'), { recursive: true });
  await mkdir(join(top, 'shared'));
  await symlink(join(FIXTURE, 'node_modules'), join(top, 'node_modules'));
  await copyFile(join(FIXTURE, 'src/main.ts'), join(top, 'app/src/main.ts'));
  await writeFile(join(top, 'app/src/App.vue'), SHARED_APP);
  await writeFile(join(top, 'shared/Orders.vue'), SHARED_ORDERS);

  const entry = await readFile(join(FIXTURE, 'src/style.css'), 'utf8');

  await writeFile(join(top, 'app/src/style.css'), `${entry}${entryTail}`);

  try {
    return await buildApp(join(top, 'app'));
  } finally {
    await rm(top, { recursive: true, force: true });
  }
};

const FIXTURE_FILES = ['src/main.ts', 'src/App.vue', 'src/style.css'];
const STYLE_MODULE = '/src/style.css';

const copyFixture = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'numior-kit-dev-'));

  await mkdir(join(root, 'src'));
  await symlink(join(FIXTURE, 'node_modules'), join(root, 'node_modules'));
  for (const file of FIXTURE_FILES) {
    await copyFile(join(FIXTURE, file), join(root, file));
  }
  return root;
};

export const startFixture = async (): Promise<DevApp> => {
  const root = await copyFixture();

  const server = await createServer({
    root,
    cacheDir: join(root, '.vite'),
    configFile: false,
    logLevel: 'silent',
    server: { middlewareMode: true, ws: false, watch: null },
    plugins: [vue(), ...kitPlugins(readManifest())],
  });

  return {
    styles: async () => (await server.transformRequest(STYLE_MODULE))?.code ?? '',
    add: async (file, text) => {
      await writeFile(join(root, file), text);
      server.watcher.emit('add', join(root, file));
    },
    close: async () => {
      await server.close();
      await rm(root, { recursive: true, force: true });
    },
  };
};
