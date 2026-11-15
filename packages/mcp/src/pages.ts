import type { McpData, McpLocale, McpPage } from './data.types';

const ORIGIN = /^[a-z][a-z\d+.-]*:\/\/[^/]+/iu;
const QUERY = /[?#].*$/u;
const MARKDOWN = /\.md$/u;
const INDEX = /(?:^|\/)index$/u;
const LEADING_SLASH = /^\/?/u;
const LOCALE_PREFIX = /^\/en(?=\/|$)/u;
const TRAILING_SLASH = /(?<=.)\/$/u;

const pagePathOf = (address: string): string =>
  address
    .trim()
    .replace(ORIGIN, '')
    .replace(QUERY, '')
    .replace(MARKDOWN, '')
    .replace(INDEX, '')
    .replace(LEADING_SLASH, '/')
    .replace(LOCALE_PREFIX, '')
    .replace(TRAILING_SLASH, '') || '/';

export const findPage = (
  data: McpData,
  locale: McpLocale,
  address: string,
): McpPage | undefined => {
  const path = pagePathOf(address);

  return data.pages[locale].find((page) => page.path === path);
};
