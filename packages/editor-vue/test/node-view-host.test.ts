import { contentSchema } from '@numior/content';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { shallowRef } from 'vue';
import { fileBlock } from '../src';
import { createNodeViewHost, type NodeViewHost } from '../src/blocks/node-view-host';
import { createNodeViews, type NodeViewEntry } from '../src/blocks/node-views';
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
      mount: () => undefined,
    };
  });

  return { chunk, entries };
};

const fileNode = (name: string) =>
  contentSchema.element('file', { id: 'f', attrs: { url: '/a.pdf', name } });

const shownKeys = (current: NodeViewHost): readonly number[] => [...current.shown.keys()];

describe('node view host', () => {
  it('mounts a view once its block comes near the screen', () => {
    const { entries } = chunkWith(2);

    host = createNodeViewHost();

    for (const entry of entries) {
      host.sink.add(entry);
    }

    expect(shownKeys(host)).toEqual([]);

    const first = entries[0]?.dom ?? document.body;

    intersections.cross(first, false);
    expect(shownKeys(host)).toEqual([]);

    intersections.cross(first);
    expect(intersections.watches(first)).toBe(false);
    expect(shownKeys(host)).toEqual([0]);
  });

  it('mounts every waiting view of a chunk when the chunk comes into view', () => {
    const { chunk, entries } = chunkWith(3);

    host = createNodeViewHost();

    for (const entry of entries) {
      host.sink.add(entry);
    }

    host.chunks.added(chunk);

    expect(intersections.watches(chunk)).toBe(true);

    host.sink.remove(2);
    intersections.cross(chunk);

    expect(shownKeys(host)).toEqual([0, 1]);

    host.chunks.removed(chunk);

    expect(intersections.watches(chunk)).toBe(false);
  });

  it('keeps the static markup of a leaf block readable until its view mounts', () => {
    host = createNodeViewHost();

    const factory = createNodeViews(document, contentSchema, [fileBlock], host.sink).file;
    const view = factory?.(fileNode('Report.pdf'));

    if (view === undefined) {
      throw new Error('The file block has no view');
    }

    const widget = view.dom.querySelector('.nui-editor__widget');

    document.body.append(view.dom);

    expect(widget?.textContent).toBe('Report.pdf');

    view.update(fileNode('Plan.pdf'));

    expect(widget?.textContent).toBe('Plan.pdf');

    intersections.cross(view.dom);

    expect(shownKeys(host)).toHaveLength(1);
    expect(widget?.childNodes).toHaveLength(0);
  });
});
