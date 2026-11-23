import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vite-plus/test';
import { PAGE_VIEW_EVENT, metrikaHead, trackPageViews } from '../.vitepress/theme/metrika';
import type { PageView } from '../.vitepress/theme/metrika';

const COUNTER = 42;

const published = { siteUrl: 'https://ui.numior.ru', repository: '' };

const headScript = (): string => {
  const [entry] = metrikaHead(published, COUNTER);
  const [, , script] = entry ?? [];

  return script ?? '';
};

const loadPage = (hostname: string, framed: boolean) => {
  const appended: string[] = [];
  const listeners = new Map<string, (event: { detail: PageView }) => void>();

  const view: Record<string, unknown> = {
    location: { hostname, href: `https://${hostname}/guide/` },
    addEventListener: (type: string, listener: (event: { detail: PageView }) => void): void => {
      listeners.set(type, listener);
    },
  };

  view.parent = framed ? {} : view;

  const document = {
    referrer: 'https://yandex.ru/',
    head: {
      appendChild: (script: { src: string }): void => {
        appended.push(script.src);
      },
    },
    createElement: (): Record<string, unknown> => ({}),
  };

  runInNewContext(headScript(), { window: view, document });

  const calls = (): unknown[][] => {
    const ym = view.ym;
    const queue = typeof ym === 'function' && 'a' in ym && Array.isArray(ym.a) ? ym.a : [];

    return queue.map((entry: ArrayLike<unknown>) => Array.from(entry));
  };

  const show = (detail: PageView): void => {
    listeners.get(PAGE_VIEW_EVENT)?.({ detail });
  };

  return { appended, calls, show };
};

const views = (hrefs: readonly string[]): PageView[] => {
  const shown: PageView[] = [];
  const target = new EventTarget();
  const router: { onAfterRouteChange?: (href: string) => void } = {};

  target.addEventListener(PAGE_VIEW_EVENT, (event) => {
    if (!(event instanceof CustomEvent)) {
      return;
    }

    shown.push(event.detail);
  });

  trackPageViews(router, {
    document: { referrer: 'https://yandex.ru/' },
    location: { href: 'https://ui.numior.ru/' },
    dispatchEvent: (event) => target.dispatchEvent(event),
  });

  for (const href of hrefs) {
    router.onAfterRouteChange?.(href);
  }

  return shown;
};

describe('Yandex Metrika on the docs site', () => {
  it('loads the counter on ui.numior.ru without an automatic first view', () => {
    const page = loadPage('ui.numior.ru', false);

    expect(page.appended).toEqual(['https://mc.yandex.ru/metrika/tag.js?id=42']);

    expect(page.calls()).toEqual([
      [
        COUNTER,
        'init',
        {
          defer: true,
          ssr: true,
          webvisor: true,
          clickmap: true,
          ecommerce: 'dataLayer',
          accurateTrackBounce: true,
          trackLinks: true,
          referrer: 'https://yandex.ru/',
          url: 'https://ui.numior.ru/guide/',
        },
      ],
    ]);
  });

  it('sends a hit for every page view the theme reports', () => {
    const page = loadPage('ui.numior.ru', false);

    page.show({ url: 'https://ui.numior.ru/guide/', referer: 'https://yandex.ru/' });

    expect(page.calls().at(-1)).toEqual([
      COUNTER,
      'hit',
      'https://ui.numior.ru/guide/',
      { referer: 'https://yandex.ru/' },
    ]);
  });

  it('stays off on other hosts and inside example frames', () => {
    for (const page of [loadPage('localhost', false), loadPage('ui.numior.ru', true)]) {
      expect(page.appended).toEqual([]);
      expect(page.calls()).toEqual([]);
    }
  });

  it('gives the head no counter while the site address is not set', () => {
    expect(metrikaHead({ siteUrl: '', repository: '' }, COUNTER)).toEqual([]);
  });

  it('reports one view per page, with the previous page as the referer', () => {
    expect(
      views([
        'https://ui.numior.ru/guide/',
        'https://ui.numior.ru/guide/#install',
        '/components/button',
        '/components/button?tab=api',
      ]),
    ).toEqual([
      { url: 'https://ui.numior.ru/guide/', referer: 'https://yandex.ru/' },
      { url: 'https://ui.numior.ru/components/button', referer: 'https://ui.numior.ru/guide/' },
      {
        url: 'https://ui.numior.ru/components/button?tab=api',
        referer: 'https://ui.numior.ru/components/button',
      },
    ]);
  });
});
