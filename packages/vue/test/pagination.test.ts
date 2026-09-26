import { describe, expect, it } from 'vitest';
import { PaginationDriver } from './drivers/pagination';
import { paginationRange } from '../src/pagination/pagination-range';

describe('paginationRange', () => {
  it('keeps boundaries and siblings around the current page and collapses the rest', () => {
    expect(paginationRange(1, 12, 1, 1)).toEqual([1, 2, 3, 4, 5, 'end-ellipsis', 12]);

    expect(paginationRange(6, 12, 1, 1)).toEqual([
      1,
      'start-ellipsis',
      5,
      6,
      7,
      'end-ellipsis',
      12,
    ]);

    expect(paginationRange(12, 12, 1, 1)).toEqual([1, 'start-ellipsis', 8, 9, 10, 11, 12]);
    expect(paginationRange(3, 5, 1, 1)).toEqual([1, 2, 3, 4, 5]);

    expect(paginationRange(25, 50, 2, 2)).toEqual([
      1,
      2,
      'start-ellipsis',
      23,
      24,
      25,
      26,
      27,
      'end-ellipsis',
      49,
      50,
    ]);
  });
});

describe('NuiPagination', () => {
  it('renders a labelled nav with the current page, moves with the controls and reports the range', async () => {
    const pagination = PaginationDriver.mount({
      props: { total: 240, label: 'Страницы' },
      page: 6,
    });

    expect(pagination.nav.attributes('aria-label')).toBe('Страницы');
    expect(pagination.entries).toEqual(['1', '…', '5', '6', '7', '…', '12']);
    expect(pagination.currentPage).toBe('6');
    expect(pagination.labelOfPage(6)).toBe('Page 6');
    expect(pagination.rangeText).toBe('101–120 of 240');
    expect(pagination.statusText).toBe('6 / 12');
    await pagination.clickNext();
    expect(pagination.page).toBe(7);
    await pagination.clickPage(12);
    expect(pagination.page).toBe(12);
    expect(pagination.nextDisabled).toBe(true);
    expect(pagination.rangeText).toBe('221–240 of 240');
    await pagination.clickPrevious();
    expect(pagination.page).toBe(11);
    pagination.unmount();
  });

  it('adds first and last controls with edges and honours siblings and boundaries', async () => {
    const pagination = PaginationDriver.mount({
      props: { total: 500, edges: true, siblings: 2, boundaries: 2 },
      page: 25,
      pageSize: 10,
    });

    expect(pagination.edgeControls).toBe(2);

    expect(pagination.entries).toEqual([
      '1',
      '2',
      '…',
      '23',
      '24',
      '25',
      '26',
      '27',
      '…',
      '49',
      '50',
    ]);

    await pagination.clickEdge('first');
    expect(pagination.page).toBe(1);
    expect(pagination.previousDisabled).toBe(true);
    await pagination.clickEdge('last');
    expect(pagination.page).toBe(50);
    pagination.unmount();
  });

  it('renders links when href is given and still updates the page model', async () => {
    const pagination = PaginationDriver.mount({
      props: { total: 60, href: (page) => `#page-${page}`, showRange: false },
      page: 2,
    });

    expect(pagination.hrefs).toEqual(['#page-1', '#page-2', '#page-3']);
    expect(pagination.currentPage).toBe('2');
    await pagination.clickPage(3);
    expect(pagination.page).toBe(3);
    pagination.unmount();
  });

  it('changes the page size through the select and clamps the page to the new count', async () => {
    const pagination = PaginationDriver.mount({
      props: { total: 240, pageSizes: [10, 20, 50], pageSizeLabel: 'На странице' },
      page: 12,
    });

    expect(pagination.rangeText).toBe('221–240 of 240');
    await pagination.choosePageSize(50);
    expect(pagination.pageSize).toBe(50);
    expect(pagination.page).toBe(5);
    expect(pagination.rangeText).toBe('201–240 of 240');
    expect(pagination.statusText).toBe('5 / 5');
    pagination.unmount();
  });

  it('shows a single empty page when there is nothing to paginate', () => {
    const pagination = PaginationDriver.mount({
      props: { total: 0, rangeLabel: (from, to, total) => `${from}–${to} из ${total}` },
    });

    expect(pagination.entries).toEqual(['1']);
    expect(pagination.rangeText).toBe('0–0 из 0');
    expect(pagination.previousDisabled).toBe(true);
    expect(pagination.nextDisabled).toBe(true);
    pagination.unmount();
  });

  it('speaks the configured language for its labels, pages and range', () => {
    const pagination = PaginationDriver.mount({
      props: { total: 240, pageSizes: [10, 20, 50] },
      page: 6,
      config: { locale: 'ru-RU' },
    });

    expect(pagination.label).toBe('Постраничная навигация');
    expect(pagination.previousLabel).toBe('Предыдущая страница');
    expect(pagination.nextLabel).toBe('Следующая страница');
    expect(pagination.pageSizeText).toBe('Строк на странице');
    expect(pagination.labelOfPage(6)).toBe('Страница 6');
    expect(pagination.rangeText).toBe('101–120 из 240');
    pagination.unmount();
  });
});
