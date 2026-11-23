import type { HeadConfig, Router } from 'vitepress';
import { topWindowOnly } from './frame-theme';
import { absoluteUrl } from './site';
import type { DocsSite } from './theme.types';

export interface PageView {
  readonly url: string;
  readonly referer: string;
}

export interface PageViewTarget {
  readonly document: { readonly referrer: string };
  readonly location: { readonly href: string };
  readonly dispatchEvent: (event: Event) => boolean;
}

export const METRIKA_COUNTER = 114629153;

export const PAGE_VIEW_EVENT = 'numior-docs:page-view';

const TAG = 'https://mc.yandex.ru/metrika/tag.js';

const OPTIONS = {
  defer: true,
  ssr: true,
  webvisor: true,
  clickmap: true,
  ecommerce: 'dataLayer',
  accurateTrackBounce: true,
  trackLinks: true,
} as const;

export const metrikaScript = (host: string, counter: number): string =>
  `(function(w,d){if(w.location.hostname!==${JSON.stringify(host)}){return}w.ym=w.ym||function(){(w.ym.a=w.ym.a||[]).push(arguments)};w.ym.l=Date.now();var s=d.createElement('script');s.async=true;s.src=${JSON.stringify(`${TAG}?id=${counter}`)};d.head.appendChild(s);w.ym(${counter},'init',Object.assign(${JSON.stringify(OPTIONS)},{referrer:d.referrer,url:w.location.href}));w.addEventListener(${JSON.stringify(PAGE_VIEW_EVENT)},function(e){w.ym(${counter},'hit',e.detail.url,{referer:e.detail.referer})})})(window,document)`;

export const metrikaHead = (target: DocsSite, counter: number): HeadConfig[] => {
  const origin = absoluteUrl(target, '');

  return origin === undefined
    ? []
    : [['script', {}, topWindowOnly(metrikaScript(new URL(origin).hostname, counter))]];
};

const pageOf = (url: URL): string => `${url.origin}${url.pathname}${url.search}`;

export const trackPageViews = (
  router: Pick<Router, 'onAfterRouteChange'>,
  view: PageViewTarget,
): void => {
  let shown = '';
  let referer = view.document.referrer;

  router.onAfterRouteChange = (href) => {
    const url = new URL(href, view.location.href);
    const page = pageOf(url);

    if (page === shown) {
      return;
    }

    view.dispatchEvent(
      new CustomEvent<PageView>(PAGE_VIEW_EVENT, { detail: { url: url.href, referer } }),
    );

    shown = page;
    referer = url.href;
  };
};
