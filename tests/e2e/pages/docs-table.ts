import type { Locator, Page } from '@playwright/test';
import { boxOf } from '../helpers/geometry';

const GROUP_LABEL = '.nui-table__group';

export class DocsGroupsTable {
  readonly root: Locator;
  private readonly viewport: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('.nui-table').filter({ hasText: /Заказы по группам|Orders by group/ });
    this.viewport = this.root.locator('.nui-table__viewport');
  }

  async resize(width: number): Promise<void> {
    await this.page.setViewportSize({ width, height: 900 });
  }

  groupLabel(position: number): Locator {
    return this.viewport.locator('.nui-table__row--group').nth(position).locator(GROUP_LABEL);
  }

  sideScroll(): Promise<number> {
    return this.viewport.evaluate((element) => element.scrollWidth - element.clientWidth);
  }

  async columnInside(col: number): Promise<boolean> {
    const header = this.viewport
      .locator(`[role="columnheader"][aria-colindex="${col + 1}"]`)
      .last();

    const [frame, own] = await Promise.all([boxOf(this.viewport), boxOf(header)]);

    return own.x >= frame.x && own.x + own.width <= frame.x + frame.width;
  }

  labelColumns(): Promise<number[]> {
    return this.viewport
      .locator(GROUP_LABEL)
      .evaluateAll((labels) =>
        labels.map(
          (label) => Number(label.closest('[aria-colindex]')?.getAttribute('aria-colindex')) - 1,
        ),
      );
  }

  async shownLabels(): Promise<string[]> {
    const frame = await boxOf(this.viewport);
    const labels = await this.viewport.locator(GROUP_LABEL).all();

    return Promise.all(
      labels.map((label) =>
        label.evaluate(
          (element, edges) => {
            const text = element.querySelector('.nui-table__text');
            const count = element.querySelector('.nui-table__count');
            const own = element.getBoundingClientRect();
            const tail = count?.getBoundingClientRect();

            const whole =
              text !== null &&
              tail !== undefined &&
              text.scrollWidth <= text.clientWidth &&
              tail.width > 1 &&
              tail.top < own.bottom &&
              own.left >= edges.start &&
              own.right <= edges.end;

            return whole ? `${text.textContent} ${count?.textContent}` : '';
          },
          { start: frame.x, end: frame.x + frame.width },
        ),
      ),
    );
  }
}
