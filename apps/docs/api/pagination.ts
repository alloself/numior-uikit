import type { DocsMap } from '../.vitepress/reference/reference.types';

const dictionary = (ru: string, en: string) => ({
  ru: `${ru}; по умолчанию из словаря.`,
  en: `${en}; the dictionary supplies the default.`,
});

const docs: DocsMap = {
  NuiPagination: {
    props: {
      total: { ru: 'Общее число элементов.', en: 'Total number of items.' },
      siblings: {
        ru: 'Сколько страниц видно по обе стороны от текущей.',
        en: 'How many pages are visible on each side of the current one.',
      },
      boundaries: {
        ru: 'Сколько страниц видно у краёв.',
        en: 'How many pages are visible at the edges.',
      },
      edges: { ru: 'Кнопки «в начало» и «в конец».', en: 'The "first" and "last" buttons.' },
      href: {
        ru: 'Адрес страницы; кнопки становятся ссылками.',
        en: 'Page address; the buttons become links.',
      },
      as: { ru: 'Компонент ссылки для href.', en: 'Link component used with href.' },
      pageSizes: {
        ru: 'Варианты размера страницы для селекта.',
        en: 'Page size options for the select.',
      },
      showRange: { ru: 'Строка «1–20 из 240».', en: 'The "1–20 of 240" line.' },
      size: { ru: 'Ступень размера кнопок.', en: 'Size step of the buttons.' },
      label: dictionary('Доступное имя навигации', 'Accessible name of the navigation'),
      previousLabel: dictionary('Имя кнопки «назад»', 'Name of the "previous" button'),
      nextLabel: dictionary('Имя кнопки «вперёд»', 'Name of the "next" button'),
      firstLabel: dictionary('Имя кнопки «в начало»', 'Name of the "first" button'),
      lastLabel: dictionary('Имя кнопки «в конец»', 'Name of the "last" button'),
      pageSizeLabel: dictionary(
        'Подпись селекта размера страницы',
        'Label of the page size select',
      ),
      pageLabel: {
        ru: 'Функция имени кнопки страницы по номеру.',
        en: 'Function that names a page button by number.',
      },
      rangeLabel: {
        ru: 'Функция текста диапазона по from, to и total.',
        en: 'Function that builds the range text from from, to and total.',
      },
    },
    models: {
      'v-model:page': { ru: 'Текущая страница от 1.', en: 'Current page, starting at 1.' },
      'v-model:pageSize': { ru: 'Элементов на странице.', en: 'Items per page.' },
    },
    keyboard: [
      {
        keys: 'Tab',
        description: { ru: 'Переходит по кнопкам страниц.', en: 'Moves through the page buttons.' },
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
