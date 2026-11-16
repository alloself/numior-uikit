import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../../../apps/docs/.vitepress/dist', import.meta.url));

const pagesOf = (dir: string): string[] =>
  readdirSync(dir)
    .toSorted()
    .flatMap((name) => {
      const path = join(dir, name);

      if (statSync(path).isDirectory()) {
        return name === 'assets' ? [] : pagesOf(path);
      }
      return name.endsWith('.html') && name !== '404.html' ? [path] : [];
    });

const routeOf = (file: string): string =>
  `/${relative(DIST, file)
    .replace(/index\.html$/, '')
    .replace(/\.html$/, '')}`;

export const docsRouteBatches = (size: number): string[][] => {
  const routes = pagesOf(DIST).map(routeOf);

  return Array.from({ length: Math.ceil(routes.length / size) }, (_, index) =>
    routes.slice(index * size, (index + 1) * size),
  );
};
