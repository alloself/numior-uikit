import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { addressFileProblems } from '../.vitepress/content/check';
import { ROBOTS, robotsOf, writeRobots } from '../.vitepress/robots';

const unpublished = { siteUrl: '', repository: '' };

const published = { siteUrl: 'https://ui.example.org', repository: '' };

const folders: string[] = [];

const folder = (): string => {
  const created = mkdtempSync(join(tmpdir(), 'numior-robots-'));

  folders.push(created);
  return created;
};

afterEach(() => {
  for (const created of folders.splice(0)) {
    rmSync(created, { recursive: true, force: true });
  }
});

describe('robots.txt', () => {
  it('lets every crawler in and points it at the sitemap and the files for language models', () => {
    expect(robotsOf(published)).toBe(
      [
        'User-agent: *',
        'Allow: /',
        '',
        '# Docs for language models: https://ui.example.org/llms.txt',
        'Sitemap: https://ui.example.org/sitemap.xml',
        '',
      ].join('\n'),
    );
  });

  it('is written to the build only once the site address is known', () => {
    const quiet = folder();
    const live = folder();

    writeRobots(quiet, unpublished);
    writeRobots(live, published);

    expect(addressFileProblems(quiet, unpublished, ROBOTS)).toEqual([]);
    expect(readFileSync(join(live, ROBOTS), 'utf8')).toContain('Sitemap: ');
    expect(addressFileProblems(live, published, ROBOTS)).toEqual([]);
  });

  it('is reported when the build lacks it or has it without a site address', () => {
    const missing = folder();
    const stray = folder();

    writeFileSync(join(stray, ROBOTS), 'User-agent: *\n');

    expect(addressFileProblems(missing, published, ROBOTS)).toEqual([
      'robots.txt: is missing although the site address is set',
    ]);

    expect(addressFileProblems(stray, unpublished, ROBOTS)).toEqual([
      'robots.txt: is written although the site address is not set',
    ]);
  });
});
