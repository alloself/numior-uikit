import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';
import { packageAssets } from '../../scripts/vite-package-assets.ts';

interface WorkspacePackage {
  readonly name: string;
  readonly dependencies: readonly string[];
}

const PACKAGES = new URL('../', import.meta.url);
const OWN_NAME = '@numior/mcp';
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies'];

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const workspacePackage = (directory: string): WorkspacePackage | undefined => {
  const manifest: unknown = JSON.parse(
    readFileSync(new URL(`${directory}/package.json`, PACKAGES), 'utf8'),
  );

  if (!isRecord(manifest) || typeof manifest.name !== 'string') {
    return undefined;
  }
  return {
    name: manifest.name,
    dependencies: DEPENDENCY_FIELDS.flatMap((field) => {
      const dependencies = manifest[field];

      return isRecord(dependencies) ? Object.keys(dependencies) : [];
    }),
  };
};

const graphEnds = (): string[] => {
  const packages = readdirSync(PACKAGES, { withFileTypes: true }).flatMap((entry) => {
    const found = entry.isDirectory() ? workspacePackage(entry.name) : undefined;

    return found === undefined ? [] : [found];
  });

  const required = new Set(packages.flatMap((found) => found.dependencies));

  return packages.flatMap((found) =>
    found.name === OWN_NAME || required.has(found.name) ? [] : [found.name],
  );
};

export default defineConfig({
  plugins: [packageAssets({ root: new URL('./', import.meta.url) })],
  build: {
    target: 'node24',
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        main: fileURLToPath(new URL('./src/main.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    sourcemap: true,
    rolldownOptions: {
      external: [
        /^@modelcontextprotocol\//,
        /^@vue\//,
        /^postcss/,
        'lodash-es',
        'minisearch',
        'zod',
        /^node:/,
      ],
      output: {
        banner: (chunk) => (chunk.name === 'main' ? '#!/usr/bin/env node' : ''),
      },
    },
  },
  run: {
    tasks: {
      reference: {
        command: 'pnpm --filter @numior/docs reference',
        dependsOn: graphEnds().map((name) => `${name}#build`),
      },
      build: {
        command: 'vp build && node scripts/build-data.ts && vue-tsc -p tsconfig.build.json',
        dependsOn: ['reference'],
      },
    },
  },
});
