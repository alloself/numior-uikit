import { fileURLToPath } from 'node:url';

export interface SourceAlias {
  readonly find: RegExp;
  readonly replacement: string;
}

const PACKAGES = fileURLToPath(new URL('../packages/', import.meta.url));

export const sourceCssAliases = (): SourceAlias[] => [
  { find: /^@numior\/tailwind$/, replacement: `${PACKAGES}tailwind/src/theme.css` },
  { find: /^@numior\/([a-z-]+)\/styles\.css$/, replacement: `${PACKAGES}$1/src/styles.css` },
  {
    find: /^@numior\/(tokens|tailwind)\/([a-z-]+)\.css$/,
    replacement: `${PACKAGES}$1/src/$2.css`,
  },
];
