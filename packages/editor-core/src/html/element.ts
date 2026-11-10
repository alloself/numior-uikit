import { HtmlNodeKind, type HtmlElement, type HtmlNode } from './html.types';

export interface OpenElement {
  readonly element: HtmlElement;
  readonly children: HtmlNode[];
}

const classesOf = (value: string | undefined): readonly string[] =>
  (value ?? '').split(/\s+/u).filter((name) => name !== '');

const stylesOf = (value: string | undefined): ReadonlyMap<string, string> => {
  const styles = new Map<string, string>();

  for (const part of (value ?? '').split(';')) {
    const colon = part.indexOf(':');
    const name = part.slice(0, colon).trim().toLowerCase();

    if (colon > 0 && name !== '') {
      styles.set(name, part.slice(colon + 1).trim());
    }
  }
  return styles;
};

const textOf = (nodes: readonly HtmlNode[]): string =>
  nodes.map((node) => (node.kind === HtmlNodeKind.Text ? node.text : node.text())).join('');

const findIn = (nodes: readonly HtmlNode[], tag: string): HtmlElement | undefined => {
  for (const node of nodes) {
    if (node.kind === HtmlNodeKind.Element) {
      const found = node.tag === tag ? node : node.find(tag);

      if (found !== undefined) {
        return found;
      }
    }
  }
  return undefined;
};

export const openElement = (tag: string, attrs: ReadonlyMap<string, string>): OpenElement => {
  const children: HtmlNode[] = [];
  let classes: readonly string[] | undefined;
  let styles: ReadonlyMap<string, string> | undefined;

  const classList = (): readonly string[] => {
    classes ??= classesOf(attrs.get('class'));
    return classes;
  };

  const element: HtmlElement = {
    kind: 'element',
    tag,
    attributes: attrs,
    children,
    attr: (name) => attrs.get(name),
    hasClass: (name) => classList().includes(name),
    classWith: (prefix) =>
      classList()
        .find((name) => name.startsWith(prefix))
        ?.slice(prefix.length),
    style: (property) => {
      styles ??= stylesOf(attrs.get('style'));
      return styles.get(property);
    },
    text: () => textOf(children),
    find: (name) => findIn(children, name),
  };

  return { element, children };
};

export const htmlElement = (
  tag: string,
  attrs: ReadonlyMap<string, string>,
  children: readonly HtmlNode[],
): HtmlElement => {
  const built = openElement(tag, attrs);

  for (const entry of children) {
    built.children.push(entry);
  }
  return built.element;
};
