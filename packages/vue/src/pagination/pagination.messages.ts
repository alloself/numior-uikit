import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiPaginationMessages {
  readonly label: string;
  readonly previous: string;
  readonly next: string;
  readonly first: string;
  readonly last: string;
  readonly pageSize: string;
  readonly page: (params: { readonly page: number }) => string;
  readonly range: (params: {
    readonly from: string;
    readonly to: string;
    readonly total: string;
  }) => string;
}

export const paginationMessages: NuiMessageCatalog<NuiPaginationMessages> = {
  namespace: 'pagination',
  en: {
    label: 'Pagination',
    previous: 'Previous page',
    next: 'Next page',
    first: 'First page',
    last: 'Last page',
    pageSize: 'Rows per page',
    page: ({ page }) => `Page ${page}`,
    range: ({ from, to, total }) => `${from}–${to} of ${total}`,
  },
  ru: {
    label: 'Постраничная навигация',
    previous: 'Предыдущая страница',
    next: 'Следующая страница',
    first: 'Первая страница',
    last: 'Последняя страница',
    pageSize: 'Строк на странице',
    page: ({ page }) => `Страница ${page}`,
    range: ({ from, to, total }) => `${from}–${to} из ${total}`,
  },
};
