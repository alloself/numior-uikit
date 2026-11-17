import { toJSON } from '@numior/editor-core';
import { afterEach, describe, expect, it } from 'vite-plus/test';
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

const toggle = (open: boolean) =>
  docOf(node('toggle', [node('paragraph', ['Head']), node('paragraph', ['Body'])], { open }));

describe('NuiContent', () => {
  it('hydrates the HTML of renderContent without mismatches', async () => {
    const doc = everyBlock();

    expect(await ContentDriver.hydrate({ document: doc }, await renderContent(doc))).toEqual([]);

    expect(
      await ContentDriver.hydrate(
        { document: doc, size: 'sm' },
        await renderContent(doc, { size: 'sm' }),
      ),
    ).toEqual([]);
  });

  it('renders the same blocks in the browser and keeps the todo state on the checkbox', async () => {
    const doc = everyBlock();
    const view = mounted({ document: doc });

    await view.iconsLoaded();

    expect(view.markup).toBe(
      (await ContentDriver.published(doc))
        .replaceAll(/ (checked|disabled|alt)(?= )/gu, ' $1=""')
        .replaceAll(' style=""', ''),
    );

    expect(view.checks).toEqual([true]);
  });

  it('lets readers fold and unfold a toggle without changing the document', async () => {
    const view = mounted({ document: everyBlock() });

    expect(view.folds).toEqual(['Head:open:true']);

    await view.fold();

    expect(view.folds).toEqual(['Head:closed:false']);

    await view.fold();

    expect(view.folds).toEqual(['Head:open:true']);
  });

  it('opens or closes a shown toggle when the author changes its default', async () => {
    const view = mounted({ document: toggle(false) });

    expect(view.folds).toEqual(['Head:closed:false']);

    await view.show(toggle(true));

    expect(view.folds).toEqual(['Head:open:true']);
  });

  it('reads JSON through its schema and reports a document it cannot read', async () => {
    const doc = docOf(node('paragraph', ['Hello']));
    const view = mounted({ document: toJSON(doc) });

    expect(view.markup).toBe(await ContentDriver.published(doc));

    await view.show({ ...toJSON(doc), schema: { name: 'other', version: 1 } });

    expect(view.markup).toBe('<div class="nui-content nui-content--size-md"></div>');

    expect(view.invalid).toEqual([
      [
        {
          kind: 'schema',
          expected: { name: 'numior-content', version: 5 },
          found: { name: 'other', version: 1 },
        },
      ],
    ]);
  });
});
