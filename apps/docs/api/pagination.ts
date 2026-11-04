import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiPagination: {
    props: {
      total: {
        ru: 'Сколько всего записей. Число страниц считается из него и `pageSize`.',
        en: 'Total number of records. The page count follows from it and `pageSize`.',
      },
      siblings: {
        ru: 'Сколько страниц видно по обе стороны от текущей.',
        en: 'How many pages are visible on each side of the current one.',
      },
      boundaries: {
        ru: 'Сколько первых и последних страниц видно всегда.',
        en: 'How many first and last pages are always visible.',
      },
      edges: {
        ru: 'Показывает кнопки перехода на первую и последнюю страницу.',
        en: 'Shows buttons that go to the first and last page.',
      },
      href: {
        ru: 'Функция, которая строит адрес по номеру страницы. Кнопки становятся ссылками.',
        en: 'Function that builds an address from a page number. The buttons become links.',
      },
      as: {
        ru: 'Компонент ссылки для `href`, например `RouterLink`.',
        en: 'Link component used with `href`, such as `RouterLink`.',
      },
      pageSizes: {
        ru: 'Варианты числа строк на странице, например `[10, 20, 50]`. Без них выбора нет.',
        en: 'Choices of rows per page, such as `[10, 20, 50]`. Without them there is no picker.',
      },
      showRange: {
        ru: 'Показывает строку вида «1–20 из 240».',
        en: 'Shows a line such as "1–20 of 240".',
      },
      size: {
        ru: 'Размер кнопок: `sm`, `md` или `lg`.',
        en: 'Size of the buttons: `sm`, `md` or `lg`.',
      },
      label: {
        ru: 'Подпись навигации для экранных дикторов. По умолчанию — «Постраничная навигация».',
        en: 'Navigation label for screen readers. Defaults to "Pagination".',
      },
      previousLabel: {
        ru: 'Подпись кнопки «назад». По умолчанию — «Предыдущая страница».',
        en: 'Label of the previous button. Defaults to "Previous page".',
      },
      nextLabel: {
        ru: 'Подпись кнопки «вперёд». По умолчанию — «Следующая страница».',
        en: 'Label of the next button. Defaults to "Next page".',
      },
      firstLabel: {
        ru: 'Подпись кнопки «в начало». По умолчанию — «Первая страница».',
        en: 'Label of the first page button. Defaults to "First page".',
      },
      lastLabel: {
        ru: 'Подпись кнопки «в конец». По умолчанию — «Последняя страница».',
        en: 'Label of the last page button. Defaults to "Last page".',
      },
      pageSizeLabel: {
        ru: 'Подпись выбора числа строк. По умолчанию — «Строк на странице».',
        en: 'Label of the rows per page picker. Defaults to "Rows per page".',
      },
      pageLabel: {
        ru: 'Функция, которая подписывает кнопку страницы для экранных дикторов, например «Страница 3».',
        en: 'Function that labels a page button for screen readers, such as "Page 3".',
      },
      rangeLabel: {
        ru: 'Функция, которая строит строку диапазона из `from`, `to` и `total`.',
        en: 'Function that builds the range line from `from`, `to` and `total`.',
      },
    },
    models: {
      'v-model:page': {
        ru: 'Номер текущей страницы, начиная с 1.',
        en: 'Current page number, starting at 1.',
      },
      'v-model:pageSize': { ru: 'Сколько строк на странице.', en: 'Number of rows per page.' },
    },
    keyboard: [
      {
        keys: 'Tab',
        description: {
          ru: 'Переходит между кнопками страниц.',
          en: 'Moves between the page buttons.',
        },
      },
      { keys: 'Enter', description: { ru: 'Открывает страницу.', en: 'Opens the page.' } },
    ],
    configurator: {
      props: ['total', 'siblings', 'boundaries', 'edges', 'showRange', 'size'],
      values: { total: 240 },
    },
  },
};

export default docs;
