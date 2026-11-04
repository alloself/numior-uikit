import { htmlElement } from './element';
import { HtmlTag, type HtmlElement, type HtmlNode } from './html.types';
import { isElement, rewriteTree, withAttr, type ChildrenRewrite } from './rewrite';

const CLASS_RULE = /\.([\w-]+)\s*\{([^}]*)\}/gu;

const CELLS = new Set(['td', 'th']);

const styleText = (node: HtmlNode): string => {
  if (!isElement(node)) {
    return '';
  }
  return node.tag === HtmlTag.Style ? node.text() : node.children.map(styleText).join('\n');
};

const classStyles = (root: HtmlElement): ReadonlyMap<string, string> =>
  new Map(
    [...styleText(root).matchAll(CLASS_RULE)].map((match) => [
      match[1] ?? '',
      (match[2] ?? '').replaceAll(/\s+/gu, ' ').trim(),
    ]),
  );

const cellsOf = (node: HtmlNode): HtmlElement[] => {
  if (!isElement(node)) {
    return [];
  }
  return CELLS.has(node.tag) ? [node] : node.children.flatMap(cellsOf);
};

const singleCells: ChildrenRewrite = (children) =>
  children.flatMap((child) => {
    const cells = isElement(child, 'table') ? cellsOf(child) : [];
    const [only] = cells;

    return cells.length === 1 && only !== undefined
      ? [htmlElement('span', new Map([['style', only.attr('style') ?? '']]), only.children)]
      : [child];
  });

const inlineClasses =
  (styles: ReadonlyMap<string, string>): ChildrenRewrite =>
  (children) =>
    children.map((child) => {
      const classes = isElement(child) ? (child.attr('class') ?? '').split(/\s+/u) : [];
      const added = classes.flatMap((name) => styles.get(name) ?? []).join(';');

      return isElement(child) && added !== ''
        ? withAttr(child, 'style', `${added};${child.attr('style') ?? ''}`)
        : child;
    });

export const normalizeSheet = (root: HtmlElement): HtmlElement => {
  const styles = classStyles(root);
  const styled = styles.size === 0 ? root : rewriteTree(root, inlineClasses(styles));

  return rewriteTree(styled, singleCells);
};
