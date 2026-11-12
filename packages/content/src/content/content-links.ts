import {
  ContentNodeKind,
  renderTag,
  type AttrValue,
  type ElementNode,
  type HtmlElement,
  type NodeSpec,
} from '@numior/editor-core';
import { embedLabel, webAddress } from './embeds';

const EMBED = 'nui-content__embed';

const BOOKMARK = 'nui-content__bookmark';

const PROVIDER = /^[a-z][a-z0-9-]{0,31}$/u;

const textOf = (value: AttrValue | undefined): string => (typeof value === 'string' ? value : '');

const isText = (value: AttrValue): boolean => typeof value === 'string';

const isWeb = (value: AttrValue): boolean =>
  typeof value === 'string' && webAddress(value) !== undefined;

const isOptionalWeb = (value: AttrValue): boolean => value === '' || isWeb(value);

const isProvider = (value: AttrValue): boolean => typeof value === 'string' && PROVIDER.test(value);

const descendant = (element: HtmlElement, name: string): HtmlElement | undefined => {
  for (const child of element.children) {
    if (child.kind !== ContentNodeKind.Element) {
      continue;
    }

    const found = child.hasClass(name) ? child : descendant(child, name);

    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
};

const textIn = (element: HtmlElement, name: string): string =>
  descendant(element, name)?.text().trim() ?? '';

const sourceIn = (element: HtmlElement, name: string): string =>
  descendant(element, name)?.attr('src') ?? '';

const renderEmbed = (node: ElementNode) => {
  const provider = textOf(node.attrs.provider);
  const caption = textOf(node.attrs.caption);

  return renderTag('figure', { class: `${EMBED} ${EMBED}--provider-${provider}` }, [
    renderTag('a', { class: `${EMBED}-link`, href: textOf(node.attrs.url) }, [
      embedLabel(provider),
    ]),
    ...(caption === ''
      ? []
      : [renderTag('figcaption', { class: 'nui-content__caption' }, [caption])]),
  ]);
};

const embedAttrs = (figure: HtmlElement) => {
  const url = descendant(figure, `${EMBED}-link`)?.attr('href');
  const provider = figure.classWith(`${EMBED}--provider-`);

  return figure.hasClass(EMBED) && url !== undefined && provider !== undefined
    ? { url, provider, caption: textIn(figure, 'nui-content__caption') }
    : false;
};

const renderBookmark = (node: ElementNode) => {
  const image = textOf(node.attrs.image);
  const icon = textOf(node.attrs.icon);
  const url = textOf(node.attrs.url);
  const title = textOf(node.attrs.title);
  const description = textOf(node.attrs.description);

  return renderTag('div', { class: BOOKMARK }, [
    renderTag('a', { class: `${BOOKMARK}-link`, href: url }, [
      renderTag('span', { class: `${BOOKMARK}-body` }, [
        renderTag('span', { class: `${BOOKMARK}-title` }, [title === '' ? url : title]),
        ...(description === ''
          ? []
          : [renderTag('span', { class: `${BOOKMARK}-description` }, [description])]),
        renderTag('span', { class: `${BOOKMARK}-site` }, [
          ...(icon === ''
            ? []
            : [
                renderTag('img', {
                  class: `${BOOKMARK}-icon`,
                  src: icon,
                  alt: '',
                  loading: 'lazy',
                }),
              ]),
          textOf(node.attrs.site) || (webAddress(url)?.hostname ?? url),
        ]),
      ]),
      ...(image === ''
        ? []
        : [renderTag('img', { class: `${BOOKMARK}-image`, src: image, alt: '', loading: 'lazy' })]),
    ]),
  ]);
};

const bookmarkAttrs = (card: HtmlElement) => {
  const link = descendant(card, `${BOOKMARK}-link`);
  const url = link?.attr('href');

  if (!card.hasClass(BOOKMARK) || link === undefined || url === undefined) {
    return false;
  }
  const title = textIn(link, `${BOOKMARK}-title`);

  return {
    url,
    title: title === url ? '' : title,
    description: textIn(link, `${BOOKMARK}-description`),
    image: sourceIn(link, `${BOOKMARK}-image`),
    icon: sourceIn(link, `${BOOKMARK}-icon`),
    site: textIn(link, `${BOOKMARK}-site`),
  };
};

export const LINK_NODES: Readonly<Record<string, NodeSpec>> = {
  embed: {
    group: 'block',
    attrs: {
      url: { verify: isWeb },
      provider: { verify: isProvider },
      caption: { default: '', verify: isText },
    },
    plainText: (node) => textOf(node.attrs.url),
    render: renderEmbed,
    parse: [{ tag: 'figure', priority: 1, attrs: embedAttrs }],
  },
  bookmark: {
    group: 'block',
    attrs: {
      url: { verify: isWeb },
      title: { default: '', verify: isText },
      description: { default: '', verify: isText },
      image: { default: '', verify: isOptionalWeb },
      icon: { default: '', verify: isOptionalWeb },
      site: { default: '', verify: isText },
    },
    plainText: (node) => textOf(node.attrs.url),
    render: renderBookmark,
    parse: [{ tag: 'div', priority: 1, attrs: bookmarkAttrs }],
  },
};
