import type { IconReference } from './reference.types.ts';

const ICON_RE =
  /(?:'([\w-]+)'|([\w-]+)):\s*lazyIcon\(\(\) => import\('lucide-vue-next\/dist\/esm\/icons\/([\w-]+)\.js'\)\)/g;

export const parseIconAliases = (source: string): IconReference[] =>
  [...source.matchAll(ICON_RE)].flatMap((match) => {
    const alias = match[1] ?? match[2];
    const icon = match[3];

    return alias === undefined || icon === undefined ? [] : [{ alias, icon }];
  });
