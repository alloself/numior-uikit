import type { NuiEditorLinkMetadata } from '@numior/editor-vue';

const DELAY_MS = 600;

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
