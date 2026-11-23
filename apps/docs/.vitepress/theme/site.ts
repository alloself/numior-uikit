import type { DocsSite } from './theme.types';

const DOCS_ROOT = 'apps/docs';
const DEFAULT_BRANCH = 'master';

export const site: DocsSite = {
  siteUrl: 'https://ui.numior.ru',
  repository: 'https://github.com/alloself/numior-uikit',
};

const trimmed = (value: string): string => value.trim().replace(/\/+$/u, '');

export const absoluteUrl = (target: DocsSite, path: string): string | undefined => {
  const origin = trimmed(target.siteUrl);

  if (origin === '') {
    return undefined;
  }
  return `${origin}/${path.replace(/^\/+/u, '')}`;
};

export const repositoryUrl = (target: DocsSite): string | undefined => {
  const repository = trimmed(target.repository);

  return repository === '' ? undefined : repository;
};

export const editUrl = (target: DocsSite, relativePath: string): string | undefined => {
  const repository = repositoryUrl(target);

  if (repository === undefined) {
    return undefined;
  }
  return `${repository}/edit/${DEFAULT_BRANCH}/${DOCS_ROOT}/${relativePath}`;
};
