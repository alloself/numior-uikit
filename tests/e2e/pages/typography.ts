import type { Locator, Page } from '@playwright/test';

export class TypographySection {
  readonly root: Locator;
  readonly grid: Locator;
  readonly prose: Locator;
  readonly title: Locator;
  readonly heading: Locator;
  readonly link: Locator;
  readonly button: Locator;
  readonly escaped: Locator;
  readonly last: Locator;
  readonly small: Locator;
  readonly spacingStart: Locator;
  readonly text2xl: Locator;
  readonly measure: Locator;

  constructor(page: Page) {
    this.root = page.locator('section[aria-labelledby="typography-title"]');
    this.grid = page.getByTestId('utility-grid');
    this.prose = page.getByTestId('prose');
    this.title = page.getByTestId('prose-title');
    this.heading = page.getByTestId('prose-heading');
    this.link = page.getByTestId('prose-link');
    this.button = page.getByTestId('prose-button');
    this.escaped = page.getByTestId('prose-escaped');
    this.last = page.getByTestId('prose-last');
    this.small = page.getByTestId('prose-small');
    this.spacingStart = page.getByTestId('spacing-start');
    this.text2xl = page.getByTestId('text-2xl');
    this.measure = page.getByTestId('measure');
  }

  paragraphAfterTitle(): Locator {
    return this.title.locator('xpath=following-sibling::p[1]');
  }

  gridTrackCount(): Promise<number> {
    return this.grid.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    );
  }

  fontOf(locator: Locator): Promise<{ size: string; weight: string; lineHeight: string }> {
    return locator.evaluate((element) => {
      const style = getComputedStyle(element);

      return { size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight };
    });
  }
}
