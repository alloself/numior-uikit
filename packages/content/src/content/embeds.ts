import { UrlProtocol, YoutubeUrl } from './content.types';

export interface NuiEmbedProvider {
  readonly id: string;
  readonly label: string;
  readonly aspect: number;
  readonly source: (url: URL) => string | undefined;
}

export interface NuiEmbed {
  readonly provider: NuiEmbedProvider;
  readonly src: string;
}

export type NuiEmbedPresetId = keyof typeof EMBED_PRESETS;

const VIDEO = 16 / 9;

const BOARD = 4 / 3;

const YOUTUBE_ID = /^[\w-]{11}$/u;

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

const youtubeId = (url: URL): string | undefined => {
  if (url.hostname === YoutubeUrl.ShortHost) {
    return url.pathname.slice(1);
  }
  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    return undefined;
  }
  const [kind, id] = url.pathname.split('/').filter((part) => part !== '');

  return kind === YoutubeUrl.Shorts || kind === YoutubeUrl.Embed
    ? id
    : (url.searchParams.get('v') ?? undefined);
};

const pathAt = (url: URL, host: string, pattern: RegExp): RegExpExecArray | null =>
  url.hostname === host || url.hostname === `www.${host}` ? pattern.exec(url.pathname) : null;

export const EMBED_PRESETS = {
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    aspect: VIDEO,
    source: (url) => {
      const id = youtubeId(url);

      return id !== undefined && YOUTUBE_ID.test(id)
        ? `https://www.youtube-nocookie.com/embed/${id}`
        : undefined;
    },
  },
  vimeo: {
    id: 'vimeo',
    label: 'Vimeo',
    aspect: VIDEO,
    source: (url) => {
      const id = pathAt(url, 'vimeo.com', /^\/(\d+)\/?$/u)?.[1];

      return id === undefined ? undefined : `https://player.vimeo.com/video/${id}`;
    },
  },
  loom: {
    id: 'loom',
    label: 'Loom',
    aspect: VIDEO,
    source: (url) => {
      const id = pathAt(url, 'loom.com', /^\/share\/([\da-f]{32})\/?$/u)?.[1];

      return id === undefined ? undefined : `https://www.loom.com/embed/${id}`;
    },
  },
  figma: {
    id: 'figma',
    label: 'Figma',
    aspect: BOARD,
    source: (url) =>
      pathAt(url, 'figma.com', /^\/(?:file|design|proto|board)\/[\w-]+/u) === null
        ? undefined
        : `https://www.figma.com/embed?embed_host=numior&url=${encodeURIComponent(url.href)}`,
  },
  maps: {
    id: 'maps',
    label: 'Google Maps',
    aspect: BOARD,
    source: (url) =>
      pathAt(url, 'google.com', /^\/maps\/embed\/?$/u) === null || !url.searchParams.has('pb')
        ? undefined
        : `https://www.google.com/maps/embed?pb=${encodeURIComponent(url.searchParams.get('pb') ?? '')}`,
  },
  codepen: {
    id: 'codepen',
    label: 'CodePen',
    aspect: VIDEO,
    source: (url) => {
      const found = pathAt(url, 'codepen.io', /^\/([\w-]+)\/pen\/([\w-]+)\/?$/u);

      return found?.[1] === undefined || found[2] === undefined
        ? undefined
        : `https://codepen.io/${found[1]}/embed/${found[2]}?default-tab=result`;
    },
  },
} as const satisfies Readonly<Record<string, NuiEmbedProvider>>;

export const embedProviders = (
  allowed: readonly (NuiEmbedPresetId | NuiEmbedProvider)[],
): readonly NuiEmbedProvider[] =>
  allowed.map((entry) => (typeof entry === 'string' ? EMBED_PRESETS[entry] : entry));

export const webAddress = (value: string): URL | undefined => {
  try {
    const url = new URL(value.trim());

    return url.protocol === UrlProtocol.Https || url.protocol === UrlProtocol.Http
      ? url
      : undefined;
  } catch {
    return undefined;
  }
};

export const resolveEmbed = (
  value: string,
  providers: readonly NuiEmbedProvider[],
  only?: string,
): NuiEmbed | undefined => {
  const url = webAddress(value);

  if (url === undefined) {
    return undefined;
  }
  for (const provider of providers) {
    const src = only === undefined || provider.id === only ? provider.source(url) : undefined;

    if (src !== undefined) {
      return { provider, src };
    }
  }
  return undefined;
};

export const embedLabel = (id: string): string =>
  Object.values(EMBED_PRESETS).find((preset) => preset.id === id)?.label ?? id;
