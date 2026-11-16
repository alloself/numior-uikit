import type { Locator, Page } from '@playwright/test';
import { boxOf } from '../helpers/geometry';

const GROUP_LABEL = '.nui-table__group';

export class DocsGroupsTable {
  readonly root: Locator;
  private readonly viewport: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('.nui-table').filter({ hasText: 'Заказы по группам' });
    this.viewport = this.root.locator('.nui-table__viewport');
  }

  async resize(width: number): Promise<void> {
    await this.page.setViewportSize({ width, height: 900 });
  }

  groupLabel(position: number): Locator {
    return this.viewport.locator('.nui-table__row--group').nth(position).locator(GROUP_LABEL);
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
