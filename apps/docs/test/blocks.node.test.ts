import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import {
  BLOCKS,
  blockExampleOf,
  blockNamed,
  blockPaths,
  blockRouteOf,
  isBlockView,
} from '../.vitepress/blocks';
import { exampleSources } from '../.vitepress/examples/modules';

const DOCS = fileURLToPath(new URL('..', import.meta.url));
const EXAMPLES = join(DOCS, 'examples');
const BLOCK_TAG_RE = /<Block name="([^"]+)" \/>/g;

const galleryBlocks = (page: string): string[] =>
  [...readFileSync(join(DOCS, page), 'utf8').matchAll(BLOCK_TAG_RE)].map((match) => match[1] ?? '');

describe('docs blocks', () => {
  it('keeps the catalog, the block files of both locales and the gallery pages in step', () => {
    const names = BLOCKS.map((block) => block.name);

    expect(readdirSync(join(EXAMPLES, 'ru/blocks')).toSorted()).toEqual(names.toSorted());
    expect(readdirSync(join(EXAMPLES, 'en/blocks')).toSorted()).toEqual(names.toSorted());
    expect(galleryBlocks('blocks/index.md')).toEqual(names);
    expect(galleryBlocks('en/blocks/index.md')).toEqual(names);

    expect(
      names.filter((name) => exampleSources(EXAMPLES, `ru/${blockExampleOf(name)}`) === undefined),
    ).toEqual([]);
  });

  it('gives every block a bare page in each locale and keeps those pages out of the sitemap', () => {
    expect(blockRouteOf('SignIn', 'ru')).toBe('/blocks/view/SignIn');
    expect(blockRouteOf('SignIn', 'en')).toBe('/en/blocks/view/SignIn');
    expect(blockPaths()).toContainEqual({ params: { name: 'SignIn' } });
    expect(existsSync(join(DOCS, 'blocks/view/[name].paths.ts'))).toBe(true);
    expect(existsSync(join(DOCS, 'en/blocks/view/[name].paths.ts'))).toBe(true);

    expect(isBlockView('en/blocks/view/SignIn')).toBe(true);
    expect(isBlockView('blocks/')).toBe(false);
    expect(blockNamed('Unknown')).toBeUndefined();
    expect(blockNamed('SignIn')?.height).toBeGreaterThan(0);
  });
});
