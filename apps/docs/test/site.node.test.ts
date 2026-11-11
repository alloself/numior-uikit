import { describe, expect, it } from 'vite-plus/test';
import { absoluteUrl, editUrl, repositoryUrl, site } from '../.vitepress/theme/site';

const published = {
  siteUrl: 'https://ui.example.org/',
  repository: 'https://github.com/example/numior-ui/',
};

describe('docs site addresses', () => {
  it('gives no address while the site and the repository are not set', () => {
    expect(absoluteUrl(site, '/guide/getting-started')).toBeUndefined();
    expect(repositoryUrl(site)).toBeUndefined();
    expect(editUrl(site, 'guide/getting-started.md')).toBeUndefined();
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
      'https://github.com/example/numior-ui/edit/main/apps/docs/components/select.md',
    );
  });
});
