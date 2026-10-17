import { contentSchema } from '@numior/content';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { shallowRef } from 'vue';
import { createNodeViewHost, type NodeViewHost } from '../src/blocks/node-view-host';
import type { NodeViewEntry } from '../src/blocks/node-views';
import { FakeIntersections } from './support/intersections';

const intersections = new FakeIntersections();

let host: NodeViewHost | undefined;

beforeEach(() => {
  intersections.install();
});

afterEach(() => {
  host?.stop();
  host = undefined;
  intersections.restore();
  document.body.replaceChildren();
});

const settle = (): Promise<void> =>
  new Promise((resolve) => {
    queueMicrotask(resolve);
  });

const chunkWith = (count: number): { chunk: HTMLElement; entries: NodeViewEntry[] } => {
  const chunk = document.createElement('div');

  chunk.className = 'nui-editor__chunk';
  document.body.append(chunk);

  const entries = Array.from({ length: count }, (_, key): NodeViewEntry => {
    const dom = document.createElement('figure');

    chunk.append(dom);
    return {
      key,
      block: { name: 'image' },
      dom,
      widget: document.createElement('div'),
      node: shallowRef(
        contentSchema.element('image', { id: `i${String(key)}`, attrs: { src: 'a.png' } }),
      ),
    };
  });

  return { chunk, entries };
};

const shownKeys = (current: NodeViewHost): readonly number[] => [...current.shown.keys()];

describe('node view host', () => {
  it('mounts a view once its block comes near the screen', async () => {
    const { entries } = chunkWith(2);

    host = createNodeViewHost();
    for (const entry of entries) {
      host.sink.add(entry);
    }
    await settle();

    expect(shownKeys(host)).toEqual([]);

    const first = entries[0]?.dom ?? document.body;

    intersections.cross(first, false);
    expect(shownKeys(host)).toEqual([]);
    intersections.cross(first);
    expect(intersections.watches(first)).toBe(false);
    expect(shownKeys(host)).toEqual([0]);
  });

  it('mounts every waiting view of a chunk when the chunk comes into view', async () => {
    const { chunk, entries } = chunkWith(3);

    host = createNodeViewHost();
    for (const entry of entries) {
      host.sink.add(entry);
    }
    await settle();

    expect(intersections.watches(chunk)).toBe(true);

    host.sink.remove(2);
    intersections.cross(chunk);

    expect(shownKeys(host)).toEqual([0, 1]);
  });
});
