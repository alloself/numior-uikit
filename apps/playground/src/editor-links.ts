import type { NuiEditorLinkMetadata, NuiEditorLinkPreview } from '@numior/editor-vue';

const DELAY_MS = 600;

const SERVICE = 'https://api.microlink.io/';

const fieldOf = (value: unknown, key: string): unknown =>
  typeof value === 'object' && value !== null
    ? Object.entries(value).find(([name]) => name === key)?.[1]
    : undefined;

const textOf = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const previewOf = (body: unknown): NuiEditorLinkPreview | undefined => {
  const data = fieldOf(body, 'data');

  return fieldOf(body, 'status') === 'success' && data !== undefined
    ? {
        title: textOf(fieldOf(data, 'title')),
        description: textOf(fieldOf(data, 'description')),
        site: textOf(fieldOf(data, 'publisher')),
        image: textOf(fieldOf(fieldOf(data, 'image'), 'url')),
        icon: textOf(fieldOf(fieldOf(data, 'logo'), 'url')),
      }
    : undefined;
};

export const liveLinkMetadata: NuiEditorLinkMetadata = async (url, { signal }) => {
  const response = await fetch(`${SERVICE}?url=${encodeURIComponent(url)}`, { signal });
  const preview = previewOf(await response.json());

  if (preview === undefined) {
    throw new Error(`No metadata for ${url}`);
  }
  return preview;
};

export const fakeLinkMetadata: NuiEditorLinkMetadata = (url, { signal }) =>
  new Promise((resolve, reject) => {
    const { hostname } = new URL(url);

    const timer = setTimeout(() => {
      resolve({
        title: `Страница ${hostname}`,
        description: 'Описание страницы из адаптера метаданных песочницы.',
        site: hostname,
        image: new URL('/media/sunrise.svg', globalThis.location.origin).href,
        icon: new URL('/media/site-icon.svg', globalThis.location.origin).href,
      });
    }, DELAY_MS);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Lookup cancelled', 'AbortError'));
    });
  });
