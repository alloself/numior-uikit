import MiniSearch from 'minisearch';
import type { McpData, McpLocale, McpPage } from './data.types';
import type { PageSearch, SearchDocument, SearchHit } from './tools.types';

const HEADING = /^#{1,6}\s+(.+)$/gmu;
const HEADING_LINE = /^#{1,6}\s/u;
const FENCE = /^\s*(?:```|~~~)/u;
const FIELDS = ['title', 'headings', 'description', 'text'];
const BOOST = { title: 4, headings: 2, description: 2 };
const FUZZY = 0.2;
const SNIPPET_LENGTH = 200;
const SCORE_DIGITS = 100;

const documentOf = (page: McpPage): SearchDocument => ({
  id: page.path,
  title: page.title,
  headings: [...page.markdown.matchAll(HEADING)].map(([, heading = '']) => heading).join('\n'),
  description: page.description,
  text: page.markdown,
});

const indexOf = (pages: readonly McpPage[]): MiniSearch<SearchDocument> => {
  const index = new MiniSearch<SearchDocument>({ fields: FIELDS });

  index.addAll(pages.map(documentOf));

  return index;
};

const proseLines = (markdown: string): string[] =>
  markdown.split('\n').reduce<{ fenced: boolean; lines: string[] }>(
    (state, line) => {
      if (FENCE.test(line)) {
        state.fenced = !state.fenced;

        return state;
      }
      if (!state.fenced && !HEADING_LINE.test(line)) {
        state.lines.push(line);
      }
      return state;
    },
    { fenced: false, lines: [] },
  ).lines;

const snippetOf = (page: McpPage, terms: readonly string[]): string => {
  const line =
    proseLines(page.markdown).find((candidate) =>
      terms.some((term) => candidate.toLowerCase().includes(term)),
    ) ?? page.description;

  return line.trim().slice(0, SNIPPET_LENGTH);
};

export const createSearch = (data: McpData): PageSearch => {
  const indexes = new Map<McpLocale, MiniSearch<SearchDocument>>();

  const pages = {
    en: new Map(data.pages.en.map((page) => [page.path, page])),
    ru: new Map(data.pages.ru.map((page) => [page.path, page])),
  };

  const indexFor = (locale: McpLocale): MiniSearch<SearchDocument> => {
    const index = indexes.get(locale) ?? indexOf(data.pages[locale]);

    indexes.set(locale, index);

    return index;
  };

  return (query, locale, limit) =>
    indexFor(locale)
      .search(query, { prefix: true, fuzzy: FUZZY, boost: BOOST })
      .slice(0, limit)
      .flatMap((result): SearchHit[] => {
        const page = typeof result.id === 'string' ? pages[locale].get(result.id) : undefined;

        return page === undefined
          ? []
          : [
              {
                path: page.path,
                title: page.title,
                section: page.section,
                score: Math.round(result.score * SCORE_DIGITS) / SCORE_DIGITS,
                snippet: snippetOf(page, result.terms),
              },
            ];
      });
};
