import { htmlElement } from './element';
import type { HtmlElement, HtmlNode } from './html.types';

export type ChildrenRewrite = (children: readonly HtmlNode[], parent: HtmlElement) => HtmlNode[];

export const isElement = (node: HtmlNode | undefined, tag?: string): node is HtmlElement =>
  node?.kind === 'element' && (tag === undefined || node.tag === tag);

export const withChildren = (element: HtmlElement, children: readonly HtmlNode[]): HtmlElement =>
  htmlElement(element.tag, element.attributes, children);

export const renamed = (element: HtmlElement, tag: string): HtmlElement =>
  htmlElement(tag, element.attributes, element.children);

export const withAttr = (
  element: HtmlElement,
  name: string,
  value: string | undefined,
): HtmlElement => {
  const attrs = new Map(element.attributes);

  if (value === undefined) {
    attrs.delete(name);
  } else {
    attrs.set(name, value);
  }
  return htmlElement(element.tag, attrs, element.children);
};

export const rewriteTree = (root: HtmlElement, rewrite: ChildrenRewrite): HtmlElement => {
  const children = root.children.map((child) =>
    child.kind === 'element' ? rewriteTree(child, rewrite) : child,
  );

  return withChildren(root, rewrite(children, root));
};

export const isBlank = (node: HtmlNode): boolean =>
  node.kind === 'text' ? node.text.trim() === '' : false;

const LISTS = new Set(['ul', 'ol']);

export const nestLists: ChildrenRewrite = (children, parent) => {
  if (!LISTS.has(parent.tag)) {
    return [...children];
  }
  const result: HtmlNode[] = [];

  for (const child of children) {
    const last = result.findLast((node) => !isBlank(node));

    if (isElement(child) && LISTS.has(child.tag) && isElement(last, 'li')) {
      result.splice(result.lastIndexOf(last), 1, withChildren(last, [...last.children, child]));
    } else {
      result.push(child);
    }
  }
  return result;
};
