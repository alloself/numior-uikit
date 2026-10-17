import { createNuiConfig } from '@numior/vue';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { contentMediaViews } from '../../src/media';
import { ContentDriver } from '../drivers/content';
import { docOf, node } from '../support/documents';

let driver: ContentDriver | undefined;

const dialog = HTMLDialogElement.prototype;

beforeEach(() => {
  Object.defineProperty(dialog, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });

  Object.defineProperty(dialog, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
});

afterEach(() => {
  driver?.destroy();
  driver = undefined;
  Reflect.deleteProperty(dialog, 'showModal');
  Reflect.deleteProperty(dialog, 'close');
});

const media = () =>
  docOf(
    node('image', [], {
      src: 'https://numior.test/sunset.jpg',
      alt: 'Sunset',
      caption: 'Evening',
      width: 0.5,
      align: 'end',
    }),
    node('image', [], { src: 'https://numior.test/plain.png' }),
    node('file', [], {
      url: 'https://numior.test/report.pdf',
      name: 'Report.pdf',
      size: 2_516_582,
      type: 'application/pdf',
    }),
  );

describe('NuiContent media views', () => {
  it('opens a published image full screen from a labelled button and closes it again', async () => {
    driver = ContentDriver.mount({ document: media(), views: contentMediaViews });

    expect(driver.figures).toEqual([
      'nui-content__image nui-content__image--align-end|inline-size: 50%;|Open the image: Sunset',
      'nui-content__image nui-content__image--align-center||Open the image',
    ]);

    expect(driver.viewer).toBeUndefined();

    await driver.zoom();

    expect(driver.viewer).toBe('open:https://numior.test/sunset.jpg');

    await driver.closeViewer();

    expect(driver.viewer).toBe('closed:https://numior.test/sunset.jpg');
  });

  it('shows the file size in the language of the page', () => {
    driver = ContentDriver.mount({ document: media(), views: contentMediaViews }, [
      createNuiConfig({ locale: 'ru-RU' }),
    ]);

    expect(driver.files).toEqual([
      'nui-content__file nui-content__file--kind-pdf|https://numior.test/report.pdf|Report.pdf|Report.pdf2,4 МБ',
    ]);

    expect(driver.figures[1]).toContain('Открыть изображение');
  });

  it('renders the media views on the server without the viewer', async () => {
    const html = await ContentDriver.ssr({ document: media(), views: contentMediaViews });

    expect(html).toContain('<button type="button" class="nui-content__zoom"');
    expect(html).toContain('<span class="nui-content__file-size">2.4 MB</span>');
    expect(html).not.toContain('<dialog');
  });
});
