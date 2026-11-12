import type { ExampleLocale } from './examples/example.types.ts';

export interface BlockEntry {
  readonly name: string;
  readonly height: number;
}

const BLOCK_FAMILY = 'blocks';
const VIEW_ROUTE = '/blocks/view/';
const DEFAULT_HEIGHT = 640;

export const BLOCKS: readonly BlockEntry[] = [
  { name: 'AppShell', height: 720 },
  { name: 'OrdersTable', height: 640 },
  { name: 'SignIn', height: 600 },
  { name: 'OrderDialog', height: 640 },
  { name: 'ProductForm', height: 860 },
  { name: 'CommandPalette', height: 560 },
  { name: 'CustomersSplit', height: 720 },
  { name: 'PriceSheet', height: 680 },
  { name: 'ProductDescription', height: 760 },
  { name: 'CoEditing', height: 480 },
  { name: 'SalesDashboard', height: 680 },
];

export const blockExampleOf = (name: string): string => `${BLOCK_FAMILY}/${name}`;

export const blockRouteOf = (name: string, locale: ExampleLocale): string =>
  `${locale === 'ru' ? '' : `/${locale}`}${VIEW_ROUTE}${name}`;

export const blockNamed = (name: string): BlockEntry | undefined =>
  BLOCKS.find((block) => block.name === name);

export const blockHeightOf = (name: string): number => blockNamed(name)?.height ?? DEFAULT_HEIGHT;

export const isBlockView = (url: string): boolean => url.includes(VIEW_ROUTE.slice(1));

export const blockPaths = (): { readonly params: { readonly name: string } }[] =>
  BLOCKS.map((block) => ({ params: { name: block.name } }));
