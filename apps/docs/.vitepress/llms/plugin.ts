import type { Plugin } from 'vitepress';
import { llmsCatalogFile, llmsTwin } from './files.ts';
import type { LlmsSource } from './llms.types.ts';

type Headers = Readonly<Record<string, string | readonly string[] | undefined>>;

const MARKDOWN = 'text/markdown';
const TWIN_RE = /\.md$/u;

const acceptsMarkdown = (headers: Headers): boolean => {
  const accept = headers.accept;

  return typeof accept === 'string' && accept.includes(MARKDOWN);
};

const pathOf = (url: string | undefined): string =>
  decodeURIComponent((url ?? '').split(/[?#]/u)[0] ?? '').replace(/^\/+/u, '');

export const llmsResponse = (
  source: LlmsSource,
  url: string | undefined,
  headers: Headers,
): { readonly type: string; readonly body: string } | undefined => {
  const path = pathOf(url);

  if (TWIN_RE.test(path)) {
    const twin = acceptsMarkdown(headers) ? llmsTwin(source, path) : undefined;

    return twin === undefined ? undefined : { type: `${MARKDOWN}; charset=utf-8`, body: twin };
  }
  const catalog = llmsCatalogFile(source, path);

  return catalog === undefined ? undefined : { type: 'text/plain; charset=utf-8', body: catalog };
};

export const docsLlms = (source: Omit<LlmsSource, 'srcDir'>): Plugin => ({
  name: 'nui-docs-llms',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const answer = llmsResponse(
        { ...source, srcDir: server.config.root },
        request.url,
        request.headers,
      );

      if (answer === undefined) {
        next();

        return;
      }
      response.setHeader('Content-Type', answer.type);
      response.end(answer.body);
    });
  },
});
