import { describe, expect, it } from 'vite-plus/test';
import { EMBED_PRESETS, embedProviders, resolveEmbed, type NuiEmbedProvider } from '../src';

const all = Object.values(EMBED_PRESETS);

const sourceOf = (url: string, providers: readonly NuiEmbedProvider[] = all): string | undefined =>
  resolveEmbed(url, providers)?.src;

describe('embed providers', () => {
  it('turns links of the known providers into their player addresses', () => {
    expect(
      [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        'https://vimeo.com/76979871',
        'https://www.loom.com/share/0123456789abcdef0123456789abcdef',
        'https://www.figma.com/design/abc123/Board',
        'https://www.google.com/maps/embed?pb=!1m18',
        'https://codepen.io/team/pen/xyz9',
      ].map((url) => sourceOf(url)),
    ).toEqual([
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      'https://player.vimeo.com/video/76979871',
      'https://www.loom.com/embed/0123456789abcdef0123456789abcdef',
      'https://www.figma.com/embed?embed_host=numior&url=https%3A%2F%2Fwww.figma.com%2Fdesign%2Fabc123%2FBoard',
      'https://www.google.com/maps/embed?pb=!1m18',
      'https://codepen.io/team/embed/xyz9?default-tab=result',
    ]);
  });

  it('refuses links outside the allowed providers and anything that is not a web page', () => {
    expect(sourceOf('https://www.youtube.com/watch?v=dQw4w9WgXcQ', embedProviders(['vimeo']))).toBe(
      undefined,
    );

    expect(
      [
        'https://evil.test/watch?v=dQw4w9WgXcQ',
        'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
        'javascript:alert(1)',
        'https://www.youtube.com/watch?v=short',
        'https://www.google.com/maps/place/Berlin',
        'not a link',
      ].map((url) => sourceOf(url)),
    ).toEqual([undefined, undefined, undefined, undefined, undefined, undefined]);
  });

  it('takes the consumer own rules beside the presets', () => {
    const board: NuiEmbedProvider = {
      id: 'board',
      label: 'Board',
      aspect: 1,
      source: (url) =>
        url.hostname === 'board.test' ? `https://board.test/embed${url.pathname}` : undefined,
    };

    const providers = embedProviders(['youtube', board]);

    expect(resolveEmbed('https://board.test/42', providers)).toEqual({
      provider: board,
      src: 'https://board.test/embed/42',
    });

    expect(resolveEmbed('https://board.test/42', providers, 'youtube')).toBeUndefined();
  });
});
