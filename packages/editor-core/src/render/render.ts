import type { RenderAttrValue, RenderChild, RenderElement, RenderHole } from './render.types';

export const contentHole: RenderHole = { kind: 'hole' };

const attrText = (value: RenderAttrValue): string | undefined => {
  if (value === null || value === undefined || value === false) {
    return undefined;
  }
  return value === true ? '' : String(value);
};

const childOf = (child: RenderChild | string): RenderChild =>
  typeof child === 'string' ? { kind: 'text', text: child } : child;

export const renderTag = (
  tag: string,
  attrs: Readonly<Record<string, RenderAttrValue>> = {},
  children: readonly (RenderChild | string)[] = [],
): RenderElement => {
  const written: Record<string, string> = {};

  for (const [name, value] of Object.entries(attrs)) {
    const text = attrText(value);

    if (text === undefined) {
      continue;
    }

    written[name] = text;
  }
  return { kind: 'element', tag, attrs: written, children: children.map(childOf) };
};
