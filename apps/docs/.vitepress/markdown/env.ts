import type { MarkdownPageEnv } from './markdown.types';

const isPageEnv = (env: unknown): env is MarkdownPageEnv => typeof env === 'object' && env !== null;

export const isEnglishPage = (env: unknown): boolean =>
  isPageEnv(env) && env.relativePath?.startsWith('en/') === true;
