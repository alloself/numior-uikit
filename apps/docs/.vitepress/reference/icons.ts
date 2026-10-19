import type { IconReference } from './reference.types.ts';

const ICON_RE = /^\s+(?:'([\w-]+)'|([\w-]+)): '([\w-]+)',$/gm;

export const parseIconAliases = (source: string): IconReference[] =>
  [...source.matchAll(ICON_RE)].flatMap((match) => {
    const alias = match[1] ?? match[2];
    const icon = match[3];

    return alias === undefined || icon === undefined ? [] : [{ alias, icon }];
  });
