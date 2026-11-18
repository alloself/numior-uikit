const DECLARATION_RE = /(--[a-z0-9-]+):\s*([^;{}]+);/gu;
const SPACE_RE = /\s+/gu;

export const cssDeclarationsOf = (css: string): ReadonlyMap<string, string> =>
  new Map(
    Array.from(css.matchAll(DECLARATION_RE), ([, name = '', value = '']) => [
      name,
      value.replace(SPACE_RE, ' ').trim(),
    ]),
  );
