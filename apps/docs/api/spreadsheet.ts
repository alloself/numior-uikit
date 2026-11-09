import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiSpreadsheet: {
    props: {
      book: {
        ru: 'Книга из `createWorkbook()` или открытого файла. Компонент меняет её правками.',
        en: 'Book from `createWorkbook()` or an opened file. Edits change it in place.',
      },
      calculator: {
        ru: 'Вычислитель книги из `createCalculator(book)`. Без него компонент создаёт свой.',
        en: 'Calculator of the book from `createCalculator(book)`. Created automatically when omitted.',
      },
      label: {
        ru: 'Доступное имя таблицы.',
        en: 'Accessible name of the grid.',
      },
      locale: {
        ru: 'Язык формул и чисел: `RU_LOCALE` или `EN_LOCALE`. По умолчанию следует языку приложения.',
        en: 'Language of formulas and numbers: `RU_LOCALE` or `EN_LOCALE`. Follows the app language by default.',
      },
      height: {
        ru: 'Высота компонента, любое значение CSS.',
        en: 'Height of the component, any CSS value.',
      },
      readonly: {
        ru: 'Запрещает правки, значения можно читать и копировать.',
        en: 'Turns editing off. Values can still be read and copied.',
      },
      formulaBar: {
        ru: 'Показывает поле адреса и строку формул.',
        en: 'Shows the name box and the formula bar.',
      },
      sheetTabs: {
        ru: 'Показывает вкладки листов.',
        en: 'Shows the sheet tabs.',
      },
      contextMenu: {
        ru: 'Добавляет свои пункты в меню ячейки. Получает `{ sheet, selection }`, возвращает пункты меню.',
        en: 'Adds items to the cell menu. Receives `{ sheet, selection }` and returns menu items.',
      },
      report: {
        ru: 'Отчёт об ограничениях открытого файла. Книга с `readOnly: true` открывается только для чтения.',
        en: 'Limitations report of an opened file. A book with `readOnly: true` opens read-only.',
      },
      fileBar: {
        ru: 'Показывает панель с именем файла, кнопками «Открыть» и «Сохранить» и включает `Ctrl+O` и `Ctrl+S`.',
        en: 'Shows the bar with the file name, Open and Save buttons, and turns on `Ctrl+O` and `Ctrl+S`.',
      },
      fileName: {
        ru: 'Имя файла на панели и при сохранении.',
        en: 'File name on the bar and when saving.',
      },
      source: {
        ru: 'Исходный пакет XLSX. Части файла, которые компонент не понимает, сохраняются из него без изменений.',
        en: 'Original XLSX package. Parts the component does not understand are saved from it unchanged.',
      },
      saveFile: {
        ru: 'Получает `{ name, bytes, report }` вместо скачивания файла браузером.',
        en: 'Receives `{ name, bytes, report }` instead of the browser downloading the file.',
      },
      peers: {
        ru: 'Кто ещё открыл книгу: результат `workbookPeers` из `onPresence` клиента. Выделение людей с текущего листа рисуется цветными рамками с именем.',
        en: 'Who else has the book open: the result of `workbookPeers` from the client `onPresence`. Selections of people on the shown sheet are drawn as coloured frames with a name.',
      },
      collaboration: {
        ru: 'Документ совместной правки из `createWorkbookDocument`. Правки других людей появляются без события `change`.',
        en: 'Shared document from `createWorkbookDocument`. Edits by other people appear without a `change` event.',
      },
    },
    models: {
      'v-model:sheet': {
        ru: 'Номер показанного листа, начиная с нуля.',
        en: 'Index of the shown sheet, starting at zero.',
      },
      'v-model:selection': {
        ru: 'Активная ячейка `active` и выделенные диапазоны `ranges`.',
        en: 'Active cell `active` and selected ranges `ranges`.',
      },
    },
    events: {
      presence: {
        ru: 'Своё место в книге изменилось: `{ sheet, selection }` или `null`. Передайте в `client.setPresence({ user, place })`.',
        en: 'Your place in the book changed: `{ sheet, selection }` or `null`. Pass it to `client.setPresence({ user, place })`.',
      },
      change: {
        ru: 'Срабатывает после каждой своей правки и отмены. Передаёт `{ steps }`.',
        en: 'Fires after each local edit and undo, with `{ steps }`.',
      },
      open: {
        ru: 'Срабатывает, когда файл открыт. Передаёт новые `book`, `calculator`, `report`, `source` и `fileName`.',
        en: 'Fires when a file is opened, with the new `book`, `calculator`, `report`, `source` and `fileName`.',
      },
      saved: {
        ru: 'Срабатывает после сохранения. Передаёт `{ name, bytes, report }`.',
        en: 'Fires after saving, with `{ name, bytes, report }`.',
      },
    },
    exposed: {
      refresh: {
        ru: 'Пересчитывает формулы и перерисовывает ячейки после изменения книги снаружи.',
        en: 'Recalculates formulas and redraws cells after the book changed from outside.',
      },
      apply: {
        ru: 'Применяет шаги книги как одну правку с отменой. Возвращает `false`, если шаг не применился.',
        en: 'Applies workbook steps as one undoable edit. Returns `false` when a step fails.',
      },
      openRules: {
        ru: 'Открывает поповер правил условного форматирования у активной ячейки.',
        en: 'Opens the conditional formatting rules popover at the active cell.',
      },
      save: {
        ru: 'Сохраняет книгу в XLSX. Возвращает `true`, если файл записан.',
        en: 'Saves the book as XLSX. Returns `true` when the file is written.',
      },
      open: {
        ru: 'Открывает переданный файл XLSX. Возвращает `true`, если файл прочитан.',
        en: 'Opens the given XLSX file. Returns `true` when the file is read.',
      },
    },
    keyboard: [
      {
        keys: 'F2',
        description: {
          ru: 'Открывает правку активной ячейки.',
          en: 'Starts editing the active cell.',
        },
      },
      {
        keys: 'Enter / Tab',
        description: {
          ru: 'Сохраняет правку и переходит вниз или вправо.',
          en: 'Commits the edit and moves down or right.',
        },
      },
      {
        keys: 'Escape',
        description: {
          ru: 'Отменяет правку ячейки.',
          en: 'Cancels the cell edit.',
        },
      },
      {
        keys: 'Alt+Enter',
        description: {
          ru: 'В строке формул переносит текст на новую строку.',
          en: 'Breaks the line in the formula bar.',
        },
      },
      {
        keys: 'F4',
        description: {
          ru: 'В формуле перебирает знаки `$` у ссылки.',
          en: 'In a formula cycles the `$` signs of a reference.',
        },
      },
      {
        keys: 'Ctrl+Z / Ctrl+Y',
        description: {
          ru: 'Отменяет и возвращает правку.',
          en: 'Undoes and redoes an edit.',
        },
      },
      {
        keys: 'Ctrl+C / Ctrl+X / Ctrl+V',
        description: {
          ru: 'Копирует, вырезает и вставляет диапазон со сдвигом ссылок в формулах.',
          en: 'Copies, cuts and pastes a range, shifting the references in formulas.',
        },
      },
      {
        keys: 'Ctrl+D / Ctrl+R',
        description: {
          ru: 'Заполняет выделение вниз или вправо из первой строки или колонки.',
          en: 'Fills the selection down or right from its first row or column.',
        },
      },
      {
        keys: 'Delete',
        description: {
          ru: 'Очищает выделенные ячейки.',
          en: 'Clears the selected cells.',
        },
      },
      {
        keys: 'Ctrl+S / Ctrl+O',
        description: {
          ru: 'С `fileBar` сохраняет книгу и открывает файл.',
          en: 'With `fileBar` saves the book and opens a file.',
        },
      },
    ],
  },
};

export default docs;
