import { describe, expect, it } from 'vite-plus/test';
import { pageDistProblems } from '../.vitepress/content/check';
import { site } from '../.vitepress/theme/site';

const published = {
  siteUrl: 'https://ui.example.org',
  repository: 'https://github.com/example/numior-ui',
};

const HEAD = [
  '<meta name="description" content="Starts an action.">',
  '<meta property="og:title" content="Button">',
].join('');

const CANONICAL = '<link rel="canonical" href="https://ui.example.org/components/button">';
const EDIT = '<a href="https://github.com/example/numior-ui/edit/main/apps/docs/a.md">Edit</a>';
const FOOTER = '<footer><a href="https://github.com/example/numior-ui">GitHub</a></footer>';

describe('built page check', () => {
  it('accepts a described page without addresses while the site config is empty', () => {
    expect(pageDistProblems('components/button.html', HEAD, site)).toEqual([]);
    expect(pageDistProblems('404.html', '<title>404</title>', site)).toEqual([]);
  });

  it('reports a page without a description or a preview title and a leftover tag', () => {
    expect(pageDistProblems('index.html', '<meta name="description" content="">', site)).toEqual([
      'has no description',
      'has no title for link previews',
    ]);

    expect(pageDistProblems('index.html', `${HEAD}<NuiButton>`, site)).toEqual([
      'has an unresolved component tag',
    ]);
  });

  it('reports addresses and repository links that an empty site config must not produce', () => {
    expect(pageDistProblems('index.html', HEAD + CANONICAL + EDIT + FOOTER, site)).toEqual([
      'has an address although the site address is not set',
      'has an edit link although the repository is not set',
      'links to GitHub in the footer although the repository is not set',
    ]);

    expect(pageDistProblems('index.html', `${HEAD}<link hreflang="en" href="/en/">`, site)).toEqual(
      ['has an address although the site address is not set'],
    );
  });

  it('requires the canonical address once the site address is set', () => {
    expect(pageDistProblems('index.html', HEAD + CANONICAL + EDIT + FOOTER, published)).toEqual([]);

    expect(pageDistProblems('index.html', HEAD, published)).toEqual(['has no canonical address']);
    expect(pageDistProblems('404.html', '<title>404</title>', published)).toEqual([]);
  });
});
