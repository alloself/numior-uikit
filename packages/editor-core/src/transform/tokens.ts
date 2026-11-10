import { nodeSize, normalizeContent, withContent } from '../model/node';
import {
  ContentNodeKind,
  type ContentNode,
  type ElementNode,
  type TextNode,
} from '../model/node.types';
import { TokenKind } from './step.types';

export type Token =
  | { readonly kind: typeof TokenKind.Open; readonly node: ElementNode }
  | { readonly kind: typeof TokenKind.Close }
  | { readonly kind: typeof TokenKind.Text; readonly node: TextNode }
  | { readonly kind: typeof TokenKind.Node; readonly node: ElementNode };

export interface Rebuilt {
  readonly content: readonly ContentNode[];
  readonly rebuilt: readonly ElementNode[];
}

export interface SliceFrame {
  readonly head: readonly Token[];
  readonly inner: readonly Token[];
  readonly tail: readonly Token[];
}

const CLOSE: Token = { kind: 'close' };

const tokenSize = (token: Token): number => {
  switch (token.kind) {
    case TokenKind.Text:
      return token.node.text.length;
    case TokenKind.Node:
      return token.node.size;
    case TokenKind.Open:
    case TokenKind.Close:
      return 1;
  }
};

const splitText = (node: TextNode, start: number, cuts: readonly number[]): Token[] => {
  const edges = [0, ...cuts.map((cut) => cut - start), node.text.length];

  return edges.slice(1).flatMap((end, index) => {
    const text = node.text.slice(edges[index] ?? 0, end);

    return text === '' ? [] : [{ kind: 'text', node: { ...node, text } }];
  });
};

export const contentTokens = (
  content: readonly ContentNode[],
  start: number,
  cuts: readonly number[],
): Token[] => {
  const tokens: Token[] = [];
  let offset = start;

  for (const child of content) {
    const end = offset + nodeSize(child);
    const inside = cuts.filter((cut) => cut > offset && cut < end);

    if (child.kind === ContentNodeKind.Text) {
      for (const entry of splitText(child, offset, inside)) {
        tokens.push(entry);
      }
    } else if (inside.length === 0 || child.leaf) {
      tokens.push({ kind: 'node', node: child });
    } else {
      tokens.push({ kind: 'open', node: child });
      for (const entry of contentTokens(child.content, offset + 1, inside)) {
        tokens.push(entry);
      }
      tokens.push(CLOSE);
    }
    offset = end;
  }
  return tokens;
};

const frameTokens = (
  content: readonly ContentNode[],
  start: number,
  edges: readonly [number, number],
  cuts: readonly number[],
): Token[] => {
  let offset = start;

  return content.flatMap((child, index): Token[] => {
    const childStart = offset;
    const end = offset + nodeSize(child);
    const open = index === 0 ? edges[0] : 0;
    const close = index === content.length - 1 ? edges[1] : 0;
    const inside = cuts.filter((cut) => cut > childStart && cut < end);

    offset = end;

    if (child.kind === ContentNodeKind.Text) {
      return splitText(child, childStart, inside);
    }
    if (child.leaf || (open === 0 && close === 0 && inside.length === 0)) {
      return [{ kind: 'node', node: child }];
    }
    return [
      { kind: 'open', node: child },
      ...frameTokens(
        child.content,
        childStart + 1,
        [Math.max(0, open - 1), Math.max(0, close - 1)],
        inside,
      ),
      CLOSE,
    ];
  });
};

export const sliceFrame = (
  content: readonly ContentNode[],
  openStart: number,
  openEnd: number,
  cuts: readonly number[] = [],
): SliceFrame | undefined => {
  const tokens = frameTokens(content, -openStart, [openStart, openEnd], cuts);
  const head = tokens.slice(0, openStart);
  const tail = tokens.slice(tokens.length - openEnd);

  if (
    head.length + tail.length > tokens.length ||
    head.some((token) => token.kind !== TokenKind.Open) ||
    tail.some((token) => token.kind !== TokenKind.Close)
  ) {
    return undefined;
  }
  return { head, inner: tokens.slice(openStart, tokens.length - openEnd), tail };
};

export const sliceTokens = (
  content: readonly ContentNode[],
  openStart: number,
  openEnd: number,
): readonly Token[] | undefined => sliceFrame(content, openStart, openEnd)?.inner;

export const cutTokens = (tokens: readonly Token[], offset: number): [Token[], Token[]] => {
  const left: Token[] = [];
  let position = 0;

  for (const [index, token] of tokens.entries()) {
    const size = tokenSize(token);

    if (position + size > offset) {
      if (token.kind === TokenKind.Text && offset > position) {
        const split = offset - position;

        left.push({ kind: 'text', node: { ...token.node, text: token.node.text.slice(0, split) } });
        return [
          left,
          [
            { kind: 'text', node: { ...token.node, text: token.node.text.slice(split) } },
            ...tokens.slice(index + 1),
          ],
        ];
      }
      return [left, tokens.slice(index)];
    }
    left.push(token);
    position += size;
  }
  return [left, []];
};

export const rebuild = (tokens: readonly Token[]): Rebuilt | undefined => {
  const frames: Array<{ readonly node: ElementNode | undefined; readonly content: ContentNode[] }> =
    [{ node: undefined, content: [] }];

  const rebuilt: ElementNode[] = [];

  for (const token of tokens) {
    if (token.kind === TokenKind.Open) {
      frames.push({ node: token.node, content: [] });
    } else if (token.kind === TokenKind.Close) {
      const frame = frames.pop();
      const parent = frames.at(-1);

      if (frame?.node === undefined || parent === undefined) {
        return undefined;
      }
      const built = withContent(frame.node, frame.content);

      rebuilt.push(built);
      parent.content.push(built);
    } else {
      frames.at(-1)?.content.push(token.node);
    }
  }
  const [root, ...rest] = frames;

  return root === undefined || rest.length > 0
    ? undefined
    : { content: normalizeContent(root.content), rebuilt };
};
