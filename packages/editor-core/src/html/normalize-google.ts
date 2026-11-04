import { HtmlTag, PasteMarker, type HtmlElement, type HtmlNode } from './html.types';
import { isElement, rewriteTree, withAttr, withChildren, type ChildrenRewrite } from './rewrite';

const BLOCKS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'div', 'hr']);

const DECORATION = /text-decoration[^;]*;?/giu;

const isWrapper = (node: HtmlNode): node is HtmlElement =>
  isElement(node) && (node.attr('id') ?? '').startsWith('docs-internal-guid');

const isCheckbox = (node: HtmlNode): boolean =>
  isElement(node, HtmlTag.Img) && node.attr('aria-roledescription') === PasteMarker.Checkbox;

const isEmptyParagraph = (node: HtmlNode): boolean =>
  isElement(node, 'p') && node.text().trim() === '' && node.find('img') === undefined;

const undecorated = (node: HtmlNode): HtmlNode => {
  if (!isElement(node)) {
    return node;
  }
  const inner = withChildren(node, node.children.map(undecorated));
  const style = node.attr('style');

  return style === undefined ? inner : withAttr(inner, 'style', style.replaceAll(DECORATION, ''));
};

const googleBlocks: ChildrenRewrite = (children) => {
  const unwrapped = children.flatMap((child) => (isWrapper(child) ? child.children : [child]));
  const blocky = unwrapped.some((child) => isElement(child) && BLOCKS.has(child.tag));

  return unwrapped.reduce<HtmlNode[]>((found, child) => {
    if (!isCheckbox(child) && !isEmptyParagraph(child) && !(blocky && isElement(child, 'br'))) {
      found.push(isElement(child, 'a') ? undecorated(child) : child);
    }
    return found;
  }, []);
};

export const normalizeGoogleDocs = (root: HtmlElement): HtmlElement =>
  rewriteTree(root, googleBlocks);
