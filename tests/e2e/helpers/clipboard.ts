import type { Page } from '@playwright/test';

export const stubClipboard = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const copies: string[] = [];

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string): Promise<void> => {
          copies.push(text);
          return Promise.resolve();
        },
        write: async (items: readonly ClipboardItem[]): Promise<void> => {
          const texts = await Promise.all(
            items.map((item) => item.getType('text/plain').then((blob) => blob.text())),
          );

          copies.push(...texts);
        },
      },
    });

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: (command: string): boolean => {
        const source = [...document.body.querySelectorAll('textarea')].findLast(
          (area) => area.style.opacity === '0',
        );

        if (command === 'copy' && source !== undefined) {
          copies.push(source.value);
        }
        return true;
      },
    });

    Object.defineProperty(window, '__nuiCopies', { value: copies });
  });
};

export const copiedTexts = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const copies: unknown = Reflect.get(window, '__nuiCopies');

    return Array.isArray(copies) ? copies.filter((copy) => typeof copy === 'string') : [];
  });
