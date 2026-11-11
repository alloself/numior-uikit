import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import { BRAND_FILES, MARK_BLOCK, MARK_MODULE } from '../.vitepress/theme/brand';

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));

const digestOf = (name: string): string =>
  createHash('sha256')
    .update(readFileSync(`${publicDirectory}${name}`))
    .digest('hex');

describe('brand files of the docs site', () => {
  it('keeps every brandbook file byte for byte', () => {
    const digests = Object.fromEntries(
      Object.keys(BRAND_FILES).map((name) => [name, digestOf(name)]),
    );

    expect(digests).toEqual(BRAND_FILES);
  });

  it('lists every brandbook image that the public folder holds', () => {
    const images = readdirSync(publicDirectory).filter((name) => /\.(?:svg|png|ico)$/u.test(name));

    expect(images.toSorted()).toEqual(Object.keys(BRAND_FILES).toSorted());
  });

  it('draws the header mark with the contours of the brandbook mark', () => {
    const mark = readFileSync(`${publicDirectory}numior-mark.svg`, 'utf8');

    expect(mark).toContain(`d="${MARK_BLOCK}"`);
    expect(mark).toContain(`d="${MARK_MODULE}"`);
  });
});
