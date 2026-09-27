import type { DocsMap } from '../.vitepress/reference/reference.types';

const labelOf = (ru: string, en: string) => ({
  ru: `${ru}; по умолчанию из словаря.`,
  en: `${en}; the dictionary supplies the default.`,
});

const docs: DocsMap = {
  NuiTable: {
    props: {
      columns: {
        ru: 'Колонки: key, label, sortable, align, width, value, sort и опции ширины, порядка и закрепления.',
        en: 'Columns: key, label, sortable, align, width, value, sort plus width, order and sticky options.',
      },
      rows: { ru: 'Строки таблицы.', en: 'Table rows.' },
      getKey: {
        ru: 'Ключ строки; без него ключом становится JSON.',
        en: 'Row key; without it the key is the JSON.',
      },
      getChildren: {
        ru: 'Дети строки; включает дерево.',
        en: 'Children of a row; enables the tree.',
      },
      isExpandable: {
        ru: 'Строка раскрываема до загрузки детей.',
        en: 'The row is expandable before its children load.',
      },
      pinnedRows: {
        ru: 'Строки в отдельном tbody под шапкой; не сортируются.',
        en: 'Rows in a separate tbody under the header; never sorted.',
      },
      rowDrag: {
        ru: 'Ручка перетаскивания строк среди соседей.',
        en: 'Drag handle for reordering rows among siblings.',
      },
      indent: { ru: 'Отступ уровня дерева в пикселях.', en: 'Tree level indent in pixels.' },
      selectable: {
        ru: 'Чекбоксы выбора: одна строка или несколько.',
        en: 'Selection checkboxes: one row or several.',
      },
      pagination: {
        ru: 'Пагинация в подвале; true или опции NuiPagination.',
        en: 'Pagination in the footer; true or NuiPagination options.',
      },
      remote: {
        ru: 'Сортировку и страницы делает сервер; таблица только рендерит.',
        en: 'The server sorts and pages; the table only renders.',
      },
      total: {
        ru: 'Число строк на сервере при remote.',
        en: 'Number of rows on the server under remote.',
      },
      loading: {
        ru: 'Скелетоны вместо строк и aria-busy.',
        en: 'Skeletons instead of rows and aria-busy.',
      },
      loadingRows: { ru: 'Сколько скелетонов показывать.', en: 'How many skeleton rows to show.' },
      emptyLabel: labelOf('Текст пустой таблицы', 'Empty table text'),
      caption: { ru: 'Подпись таблицы.', en: 'Table caption.' },
      stickyHeader: {
        ru: 'Шапка прилипает при прокрутке.',
        en: 'The header sticks while scrolling.',
      },
      striped: { ru: 'Чередование фона строк.', en: 'Alternating row background.' },
      hoverable: { ru: 'Подсветка строки под курсором.', en: 'Row highlight under the pointer.' },
      size: { ru: 'Ступень размера строк.', en: 'Row size step.' },
      virtual: {
        ru: 'Виртуализация строк вместо пагинации; требует height.',
        en: 'Row virtualisation instead of pagination; needs height.',
      },
      height: { ru: 'Высота прокручиваемой таблицы.', en: 'Height of the scrolling table.' },
      rowHeight: {
        ru: 'Высота строки в пикселях при виртуализации.',
        en: 'Row height in pixels under virtualisation.',
      },
      selectLabel: labelOf('Имя чекбокса строки', 'Name of the row checkbox'),
      selectAllLabel: labelOf('Имя чекбокса «все»', 'Name of the "all" checkbox'),
      resizeLabel: {
        ru: 'Функция имени ручки ширины по колонке.',
        en: 'Function that names the resize handle by column.',
      },
      reorderLabel: {
        ru: 'Функция имени ручки порядка по колонке.',
        en: 'Function that names the reorder handle by column.',
      },
      expandLabel: {
        ru: 'Функция имени кнопки раскрытия по строке.',
        en: 'Function that names the expand button by row.',
      },
      dragLabel: { ru: 'Функция имени ручки строки.', en: 'Function that names the row handle.' },
      rowLabel: {
        ru: 'Функция подписи строки в призраке и объявлениях.',
        en: 'Function that labels a row in the ghost and announcements.',
      },
      announce: {
        ru: 'Функция текста для aria-live при перетаскивании.',
        en: 'Function that builds the aria-live text while dragging.',
      },
    },
    models: {
      'v-model:expanded': { ru: 'Раскрытые строки дерева.', en: 'Expanded tree rows.' },
      'v-model:sort': {
        ru: 'Сортировка: ключ колонки и направление или null.',
        en: 'Sort: column key and direction, or null.',
      },
      'v-model:selected': { ru: 'Выбранные строки.', en: 'Selected rows.' },
      'v-model:page': { ru: 'Текущая страница.', en: 'Current page.' },
      'v-model:pageSize': { ru: 'Строк на странице.', en: 'Rows per page.' },
      'v-model:columnOrder': { ru: 'Порядок колонок ключами.', en: 'Column order as keys.' },
      'v-model:widths': {
        ru: 'Ширины колонок в пикселях по ключу.',
        en: 'Column widths in pixels by key.',
      },
    },
    events: {
      load: {
        ru: 'Раскрыта строка без загруженных детей.',
        en: 'A row without loaded children was expanded.',
      },
      rowClick: {
        ru: 'Клик по строке вне чекбокса.',
        en: 'A click on a row outside the checkbox.',
      },
      reorder: {
        ru: 'Строку переставили: row, from, to, parent.',
        en: 'A row was reordered: row, from, to, parent.',
      },
    },
    slots: {
      caption: { ru: 'Разметка подписи.', en: 'Caption markup.' },
      loading: { ru: 'Содержимое вместо скелетонов.', en: 'Content instead of the skeletons.' },
      empty: { ru: 'Содержимое пустой таблицы.', en: 'Content of the empty table.' },
    },
    keyboard: [
      {
        keys: 'Enter',
        description: {
          ru: 'На кнопке заголовка меняет сортировку.',
          en: 'On a header button changes the sort.',
        },
      },
      {
        keys: 'ArrowLeft',
        description: {
          ru: 'На ручке ширины сужает колонку на 10px, с Shift — на 50px.',
          en: 'On a resize handle narrows the column by 10px, with Shift by 50px.',
        },
      },
      {
        keys: 'ArrowRight',
        description: {
          ru: 'На ручке ширины расширяет колонку на 10px, с Shift — на 50px.',
          en: 'On a resize handle widens the column by 10px, with Shift by 50px.',
        },
      },
      {
        keys: 'Space',
        description: {
          ru: 'На ручке порядка берёт и кладёт колонку или строку.',
          en: 'On a reorder handle grabs and drops the column or row.',
        },
      },
      { keys: 'Escape', description: { ru: 'Отменяет перестановку.', en: 'Cancels the reorder.' } },
    ],
  },
};

export default docs;
