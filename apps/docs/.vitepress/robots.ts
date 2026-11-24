import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { absoluteUrl } from './theme/site.ts';
import type { DocsSite } from './theme/theme.types.ts';

export const ROBOTS = 'robots.txt';

export const robotsOf = (site: DocsSite): string | undefined => {
  const sitemap = absoluteUrl(site, 'sitemap.xml');
  const llms = absoluteUrl(site, 'llms.txt');

  if (sitemap === undefined || llms === undefined) {
    return undefined;
  }

  return [
    'User-agent: *',
    'Allow: /',
    '',
    `# Docs for language models: ${llms}`,
    `Sitemap: ${sitemap}`,
    '',
  ].join('\n');
};

export const writeRobots = (outDir: string, site: DocsSite): void => {
  const robots = robotsOf(site);

  if (robots === undefined) {
    return;
  }

  writeFileSync(join(outDir, ROBOTS), robots);
};
