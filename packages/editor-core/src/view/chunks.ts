export type SizeOf = (block: Element) => number;

export interface ChunkSet {
  has(node: Node): boolean;
  add(chunk: HTMLElement): void;
  drop(chunk: HTMLElement): void;
}

const CHUNK_SIZE = 32;

const CHUNK_LIMIT = CHUNK_SIZE * 2;

const CHUNK_CLASS = 'nui-editor__chunk';

const createChunk = (document: Document, chunks: ChunkSet): HTMLElement => {
  const chunk = document.createElement('div');

  chunk.className = CHUNK_CLASS;
  chunk.style.setProperty('content-visibility', 'auto');
  chunks.add(chunk);
  return chunk;
};

const dropChunks = (root: HTMLElement, chunks: ChunkSet): void => {
  for (const child of root.children) {
    if (!(child instanceof HTMLElement) || !chunks.has(child)) {
      continue;
    }

    chunks.drop(child);
  }
};

const estimate = (chunk: HTMLElement, sizeOf: SizeOf): void => {
  let total = 0;

  for (const block of chunk.children) {
    total += sizeOf(block);
  }
  chunk.style.setProperty('contain-intrinsic-block-size', `auto ${Math.max(1, total)}px`);
};

const lastChunk = (root: HTMLElement, chunks: ChunkSet): HTMLElement => {
  const last = root.lastElementChild;

  if (last instanceof HTMLElement && chunks.has(last)) {
    return last;
  }
  const chunk = createChunk(root.ownerDocument, chunks);

  root.append(chunk);
  return chunk;
};

export const fillChunks = (
  root: HTMLElement,
  blocks: readonly ChildNode[],
  chunks: ChunkSet,
  sizeOf: SizeOf,
): void => {
  const made: HTMLElement[] = [];

  dropChunks(root, chunks);

  for (let start = 0; start < blocks.length; start += CHUNK_SIZE) {
    const chunk = createChunk(root.ownerDocument, chunks);

    chunk.append(...blocks.slice(start, start + CHUNK_SIZE));
    estimate(chunk, sizeOf);
    made.push(chunk);
  }
  root.replaceChildren(...made);
};

const followedBy = (block: ChildNode, next: ChildNode, chunks: ChunkSet): boolean => {
  if (block.nextSibling === next) {
    return true;
  }

  const chunk = block.parentNode;

  return (
    chunk !== null &&
    chunks.has(chunk) &&
    block.nextSibling === null &&
    next.previousSibling === null &&
    next.parentNode === chunk.nextSibling
  );
};

export const placeInChunks = (
  root: HTMLElement,
  blocks: readonly ChildNode[],
  anchor: ChildNode | null,
  chunks: ChunkSet,
): void => {
  let next = anchor;

  for (const block of blocks.toReversed()) {
    if (next !== null) {
      if (!followedBy(block, next, chunks)) {
        next.parentNode?.insertBefore(block, next);
      }
    } else {
      const last = lastChunk(root, chunks);

      if (block.parentNode !== last || block.nextSibling !== null) {
        last.append(block);
      }
    }
    next = block;
  }
};

const split = (chunk: HTMLElement, chunks: ChunkSet, sizeOf: SizeOf): void => {
  const blocks = [...chunk.children];
  let after: HTMLElement = chunk;

  for (let start = CHUNK_SIZE; start < blocks.length; start += CHUNK_SIZE) {
    const part = createChunk(chunk.ownerDocument, chunks);

    part.append(...blocks.slice(start, start + CHUNK_SIZE));
    after.after(part);
    estimate(part, sizeOf);
    after = part;
  }
  estimate(chunk, sizeOf);
};

export const tidyChunks = (root: HTMLElement, chunks: ChunkSet, sizeOf: SizeOf): void => {
  for (const chunk of Array.from(root.children)) {
    if (!(chunk instanceof HTMLElement) || !chunks.has(chunk)) {
      continue;
    }
    if (chunk.childNodes.length === 0) {
      chunks.drop(chunk);
      chunk.remove();
    } else if (chunk.children.length > CHUNK_LIMIT) {
      split(chunk, chunks, sizeOf);
    }
  }
};

export const appendChunk = (
  root: HTMLElement,
  blocks: readonly ChildNode[],
  chunks: ChunkSet,
  sizeOf: SizeOf,
  before: ChildNode | null,
): void => {
  const chunk = createChunk(root.ownerDocument, chunks);

  chunk.append(...blocks);
  estimate(chunk, sizeOf);
  root.insertBefore(chunk, before);
};
