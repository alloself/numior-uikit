import { toJSON } from '@numior/editor-core';
import { afterEach, describe, expect, it } from 'vitest';
import { renderContent } from '../src';
import { ContentDriver } from './drivers/content';
import { docOf, everyBlock, node } from './support/documents';

let driver: ContentDriver | undefined;

const mounted = (...args: Parameters<typeof ContentDriver.mount>): ContentDriver => {
  driver = ContentDriver.mount(...args);
  return driver;
};

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

describe('NuiContent', () => {
  it('renders a document like renderContent on the server and hydrates it without mismatches', async () => {
    const doc = everyBlock();

    expect(await ContentDriver.ssr({ document: doc })).toBe(renderContent(doc));

    expect(await ContentDriver.ssr({ document: doc, size: 'sm' })).toBe(
      renderContent(doc, { size: 'sm' }),
    );

    expect(await ContentDriver.hydrate({ document: doc })).toEqual([]);
  });

  it('renders the same blocks in the browser and keeps the todo state on the checkbox', () => {
    const doc = everyBlock();
    const view = mounted({ document: doc });

    expect(view.markup).toBe(
      renderContent(doc).replace(' checked tabindex', ' checked="" tabindex'),
    );

    expect(view.checks).toEqual([true]);
  });

  it('reads JSON through its schema and reports a document it cannot read', async () => {
    const doc = docOf(node('paragraph', ['Hello']));
    const view = mounted({ document: toJSON(doc) });

    expect(view.markup).toBe(renderContent(doc));

    await view.show({ ...toJSON(doc), schema: { name: 'other', version: 1 } });

    expect(view.markup).toBe('<div class="nui-content nui-content--size-md"></div>');

    expect(view.invalid).toEqual([
      [
        {
          kind: 'schema',
          expected: { name: 'numior-content', version: 1 },
          found: { name: 'other', version: 1 },
        },
      ],
    ]);
  });
});
