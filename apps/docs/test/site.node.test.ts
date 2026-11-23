import { describe, expect, it } from 'vite-plus/test';
import { absoluteUrl, editUrl, repositoryUrl, site } from '../.vitepress/theme/site';

const published = {
  siteUrl: 'https://ui.example.org/',
  repository: 'https://github.com/example/numior-ui/',
};

const unpublished = { siteUrl: '', repository: '' };

describe('docs site addresses', () => {
  it('gives no address while the site and the repository are not set', () => {
    expect(absoluteUrl(unpublished, '/guide/getting-started')).toBeUndefined();
    expect(repositoryUrl(unpublished)).toBeUndefined();
    expect(editUrl(unpublished, 'guide/getting-started.md')).toBeUndefined();
  });

  it('publishes the docs at ui.numior.ru with edit links into master', () => {
    expect(absoluteUrl(site, '/guide/getting-started')).toBe(
      'https://ui.numior.ru/guide/getting-started',
    );

    expect(editUrl(site, 'guide/getting-started.md')).toBe(
      'https://github.com/alloself/numior-uikit/edit/master/apps/docs/guide/getting-started.md',
    );
  });

  it('joins a page path to the site address without doubled slashes', () => {
    expect(absoluteUrl(published, '/en/components/button')).toBe(
      'https://ui.example.org/en/components/button',
    );

    expect(absoluteUrl(published, '')).toBe('https://ui.example.org/');
  });

  it('points the edit link at the page source in the repository', () => {
    expect(repositoryUrl(published)).toBe('https://github.com/example/numior-ui');

    expect(editUrl(published, 'components/select.md')).toBe(
      'https://github.com/example/numior-ui/edit/master/apps/docs/components/select.md',
    );
  });
});
