import type { Page } from '@playwright/test';

export const stubClipboard = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const copies: string[] = [];

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (text: string) => Promise.resolve(copies.push(text)) },
    });

    Object.defineProperty(window, '__nuiCopies', { value: copies });
  });
};

export const copiedTexts = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const copies: unknown = Reflect.get(window, '__nuiCopies');

    return Array.isArray(copies) ? copies.filter((copy) => typeof copy === 'string') : [];
  });
