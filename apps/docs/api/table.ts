import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiTable: {
    configurator: {
      scene: 'table/Example',
      props: [
        'size',
        'gridlines',
        'striped',
        'selectable',
        'rowHeaders',
        'columnMenu',
        'loading',
        'caption',
      ],
      values: { caption: { ru: 'Последние заказы', en: 'Latest orders' } },
    },
    props: {
      columns: {
        ru: 'Колонки таблицы: у каждой обязательны `key`, `label`, `type` (`text`, `number`, `date`, `boolean`) и функция `value`, которая берёт значение из строки. Необязательные поля — `format`, `width`, `minWidth`, `maxWidth`, `flex`, `resizable`, `reorderable`, `hideable`, `pin`, `align`, `wrap`, `sortable`, `filter`, `aggregate`, `editable`, `parse`, `rules` и `editor`. Группа `{ key, label, children }` ставит общую подпись над заголовками своих колонок.',
        en: 'Columns of the table: each needs `key`, `label`, `type` (`text`, `number`, `date`, `boolean`) and a `value` function that reads the value from a row. The optional fields are `format`, `width`, `minWidth`, `maxWidth`, `flex`, `resizable`, `reorderable`, `hideable`, `pin`, `align`, `wrap`, `sortable`, `filter`, `aggregate`, `editable`, `parse`, `rules` and `editor`. A group `{ key, label, children }` draws a shared label above the headers of its columns.',
      },
      rows: {
        ru: 'Строки таблицы. Таблица их не копирует и не меняет. С `source` не нужны.',
        en: 'Rows of the table. The table neither copies nor changes them. Not needed with `source`.',
      },
      source: {
        ru: 'Загружает строки с сервера. `fetch` отвечает `{ rows, total }` или `{ rows, hasMore }`, а необязательные `values`, `totals` и `children` отдают значения фильтра-списка, итоги и детей строки. Таблица запрашивает строки блоками по мере прокрутки, а без `height` — по страницам.',
        en: 'Loads rows from a server. `fetch` returns `{ rows, total }` or `{ rows, hasMore }`, and the optional `values`, `totals` and `children` return set filter values, totals and row children. The table requests rows in blocks as you scroll, or page by page without `height`.',
      },
      blockSize: {
        ru: 'Сколько строк запрашивать у `source` за раз. По умолчанию 100, с пагинацией — размер страницы.',
        en: 'Number of rows requested from `source` at once. 100 by default, the page size with pagination.',
      },
      getKey: {
        ru: 'Возвращает постоянный ключ строки. Без него ключом служит индекс в `rows`.',
        en: 'Returns a stable key for a row. Without it the index in `rows` is the key.',
      },
      id: {
        ru: 'Идентификатор таблицы. По умолчанию создаётся автоматически.',
        en: 'Id of the table. Generated automatically by default.',
      },
      size: {
        ru: 'Размер таблицы: `sm`, `md` или `lg`. Меняет отступы, шрифт и высоту строки.',
        en: 'Changes the size of the table: `sm`, `md` or `lg`. Affects paddings, font and row height.',
      },
      rowHeight: {
        ru: 'Высота строки в пикселях, по умолчанию 32, 40 или 48 в зависимости от `size`. Без `height` это минимум, и строка растёт по содержимому. `auto` вместе с `height` измеряет каждую строку, а колонки с `wrap` переносят текст.',
        en: 'Row height in pixels. 32, 40 or 48 by default, depending on `size`. Without `height` it is a minimum and the row grows with its content. `auto` with `height` measures each row, and columns with `wrap` wrap their text.',
      },
      height: {
        ru: 'Высота области прокрутки в единицах CSS, например `400px`. С ней таблица рисует только видимые строки и колонки, без неё — все строки и растёт по высоте.',
        en: 'Height of the scroll area in CSS units, such as `400px`. With it the table renders only the visible rows and columns; without it the table renders every row and grows in height.',
      },
      locale: {
        ru: 'Язык чисел, дат и встроенных подписей, например `ru-RU`. По умолчанию — язык из `createNuiConfig`.',
        en: 'Language of numbers, dates and built-in labels, such as `en-US`. Defaults to the language set in `createNuiConfig`.',
      },
      label: {
        ru: 'Подпись таблицы для экранных дикторов. По умолчанию — «Таблица данных» из словаря.',
        en: 'Table label for screen readers. Defaults to "Data grid" from the dictionary.',
      },
      emptyLabel: {
        ru: 'Текст пустой таблицы. По умолчанию — «Нет строк для показа» из словаря.',
        en: 'Text of an empty table. Defaults to "No rows to show" from the dictionary.',
      },
      getChildren: {
        ru: 'Возвращает дочерние строки и превращает таблицу в дерево. `groupBy` при этом не действует.',
        en: 'Returns the child rows and turns the table into a tree. `groupBy` has no effect then.',
      },
      hasChildren: {
        ru: 'Отмечает строки, чьи дети ещё не загружены: их можно раскрыть, и таблица отправит событие `load`. С `source` отмечает строки, детей которых загружает `source.children`, и `load` не приходит.',
        en: 'Marks rows whose children are not loaded yet: they can expand, and the table emits `load`. With `source` it marks the rows whose children `source.children` loads, and `load` does not fire.',
      },
      hasDetail: {
        ru: 'Отмечает строки с деталью, у остальных нет переключателя. Без функции деталь есть у каждой строки, если задан слот `detail`.',
        en: 'Marks the rows that have a detail; the others get no toggle. Without it every row has a detail when the `detail` slot is set.',
      },
      cellStyle: {
        ru: 'Оформляет ячейки тела и закреплённых строк: функция получает `{ row, column, position, pinned }` и возвращает стиль ячейки или `undefined`. В стиле бывают `fill`, `color`, `align`, `wrap`, `overflow`, `borders`, `bar`, `icon`, `scheme`, `class` и `style`. Функция вызывается для каждой показанной ячейки и снова, когда меняется строка или данные, которые она читает.',
        en: 'Styles the cells of the body and of pinned rows: the function receives `{ row, column, position, pinned }` and returns a cell style or `undefined`. The style can hold `fill`, `color`, `align`, `wrap`, `overflow`, `borders`, `bar`, `icon`, `scheme`, `class` and `style`. The function runs for each shown cell and again when the row or the data it reads changes.',
      },
      merges: {
        ru: 'Объединяет ячейки: каждый прямоугольник `{ from, to }` в координатах `v-model:ranges` становится одной ячейкой с содержимым и оформлением первой. Из двух пересекающихся прямоугольников остаётся первый. С группировкой, деревом и деталями объединения не работают.',
        en: 'Merges cells: each `{ from, to }` rectangle in `v-model:ranges` coordinates becomes one cell with the content and style of its first cell. Of two overlapping rectangles, the first one wins. Merges do not work with grouping, a tree or details.',
      },
      gridlines: {
        ru: 'Рисует линии между колонками. Линия после последней колонки видна, только пока колонки не заполняют всю ширину.',
        en: 'Draws lines between the columns. The line after the last column shows only while the columns do not fill the whole width.',
      },
      rowHeaders: {
        ru: 'Добавляет закреплённую колонку заголовков строк, как в электронных таблицах. `true` нумерует строки, а `{ label, width, resizable }` задаёт текст `label(row, position)`, ширину в пикселях и ручку высоты строки. Выделение строк и колонок по заголовкам работает только с `cellSelection`.',
        en: 'Adds a pinned column of row headers, as in spreadsheets. `true` numbers the rows, and `{ label, width, resizable }` sets the `label(row, position)` text, the width in pixels and a row height handle. Selecting rows and columns from the headers works only with `cellSelection`.',
      },
      treeColumn: {
        ru: 'Ключ колонки с отступами дерева и переключателем детали. По умолчанию — первая колонка.',
        en: 'Key of the column that holds the tree indentation and the detail toggle. The first column by default.',
      },
      totalsLabel: {
        ru: 'Подпись строки итогов рядом с числом строк после фильтров. Стоит в первой колонке без `aggregate`. По умолчанию — «Итого» из словаря.',
        en: 'Label of the totals row, shown next to the count of filtered rows in the first column without `aggregate`. Defaults to "Total" from the dictionary.',
      },
      selectable: {
        ru: 'Включает выбор строк: `single` — одной, `multiple` — нескольких. Добавляет колонку флажков, а в `multiple` — флажок «Выбрать все» в шапке для показанных строк. При переходе с `multiple` на `single` в `v-model:selected` остаётся первая выбранная строка.',
        en: 'Enables row selection: `single` for one row, `multiple` for several. Adds a checkbox column and, with `multiple`, a select-all checkbox in the header for the shown rows. Switching from `multiple` to `single` keeps the first selected row in `v-model:selected`.',
      },
      striped: {
        ru: 'Закрашивает каждую вторую строку. Узор не сбивается при прокрутке и с закреплёнными строками.',
        en: 'Shades every other row. The pattern holds while scrolling and with pinned rows.',
      },
      caption: {
        ru: 'Подпись над таблицей. Без `label` экранные дикторы читают её как название таблицы.',
        en: 'Caption above the table. Without `label` screen readers announce it as the table name.',
      },
      loading: {
        ru: 'Показывает загрузку: вместо строк — скелетоны или слот `loading`, флажок «Выбрать все» отключён. Таблица получает `aria-busy`.',
        en: 'Shows the loading state: skeleton rows or the `loading` slot replace the rows, and the select-all checkbox is disabled. The table gets `aria-busy`.',
      },
      loadingRows: {
        ru: 'Сколько строк-скелетонов показывать при загрузке. По умолчанию 5, а с `height` — сколько помещается по высоте.',
        en: 'Number of skeleton rows while loading. 5 by default, or as many as fit when `height` is set.',
      },
      selectLabel: {
        ru: 'Подпись флажка строки для экранных дикторов. По умолчанию — «Выбрать строку» из словаря.',
        en: 'Row checkbox label for screen readers. Defaults to "Select row" from the dictionary.',
      },
      selectAllLabel: {
        ru: 'Подпись флажка «Выбрать все» для экранных дикторов. По умолчанию — «Выбрать все строки» из словаря.',
        en: 'Select-all checkbox label for screen readers. Defaults to "Select all rows" from the dictionary.',
      },
      pagination: {
        ru: 'Делит строки на страницы: `true` или настройки `NuiPagination` без `total` и `size`. Страницы считаются после сортировки и фильтров, переключатель страниц стоит под таблицей. Нужны стили `NuiPagination` и `NuiSelect`.',
        en: 'Splits the rows into pages: `true` or `NuiPagination` options without `total` and `size`. Pages count after sorting and filters, and the page switcher sits below the table. Needs the `NuiPagination` and `NuiSelect` styles.',
      },
      remote: {
        ru: 'Отдаёт сортировку, фильтры и группировку серверу. Таблица только сообщает об изменении моделей и показывает `rows` как готовую страницу.',
        en: 'Leaves sorting, filters and grouping to the server. The table only reports model changes and shows `rows` as a ready page.',
      },
      total: {
        ru: 'Общее число строк для пагинации с `remote`. По умолчанию — длина `rows`.',
        en: 'Total row count for pagination with `remote`. Defaults to the length of `rows`.',
      },
      pinnedRows: {
        ru: 'Строки, закреплённые под шапкой. Они не сортируются, не фильтруются и не делятся на страницы, но выбираются и вызывают `rowClick`. Слоты их ячеек получают `pinned: true`.',
        en: 'Rows pinned under the header. They skip sorting, filters and pages but can be selected and fire `rowClick`. Their cell slots receive `pinned: true`.',
      },
      nextEdge: {
        ru: 'Задаёт, куда ведёт Ctrl со стрелкой: `(from, direction) → позиция`, где `direction` — `up`, `down`, `previous` или `next`. Без функции курсор идёт к краю таблицы. Позиция за пределами таблицы прижимается к краю.',
        en: 'Sets where Ctrl with an arrow goes: `(from, direction) → position`, where `direction` is `up`, `down`, `previous` or `next`. Without it the cursor goes to the edge of the table. A position outside the table is clamped to its edge.',
      },
      lastCell: {
        ru: 'Задаёт, куда ведёт Ctrl+End и Ctrl+Shift+End: `() → позиция` в координатах данных, например последняя занятая ячейка листа. Без функции или с ответом `undefined` курсор идёт в последнюю ячейку таблицы. Позиция за пределами таблицы прижимается к краю.',
        en: 'Sets where Ctrl+End and Ctrl+Shift+End go: `() → position` in data coordinates, such as the last used cell of a sheet. Without it, or when it answers `undefined`, the cursor goes to the last cell of the table. A position outside the table is clamped to its edge.',
      },
      keepEditing: {
        ru: 'Отмечает элементы вне таблицы, например строку формул, фокус на которых не завершает правку: `(target) → true`. Клик по ним не снимает выделение ячеек. Когда фокус уходит из такого элемента, завершите правку через `commitEdit` или `cancelEdit`.',
        en: 'Marks elements outside the table, such as a formula bar, whose focus keeps a cell edit open: `(target) → true`. A click on them keeps the cell selection. When focus leaves such an element, end the edit with `commitEdit` or `cancelEdit`.',
      },
      growEditor: {
        ru: 'Кладёт текстовый редактор точно по границам ячейки с рамкой выделения. Длинный текст растит редактор поверх соседних ячеек целыми колонками, как в Excel: у ячеек с выравниванием по концу влево, у остальных вправо. Дальше края видимой области редактор не растёт, и текст прокручивается внутри поля.',
        en: 'Puts the text editor exactly on the bounds of its cell with the selection frame. Long text grows it over the neighboring cells by whole columns, as in Excel, toward the start in end-aligned cells. It stops at the edge of the visible area, where the text starts to scroll inside the field.',
      },
      picking: {
        ru: 'Включает выбор ссылок для формул: `(draft) → true`, пока черновик ждёт ссылку, например кончается оператором. Тогда клик, протяжка и стрелки в редакторе не завершают правку, а отправляют событие `pick`.',
        en: 'Turns on reference picking for formulas: `(draft) → true` while the draft waits for a reference, for example ends with an operator. Clicks, drags and arrows in the editor then keep the edit open and emit `pick`.',
      },
      frozenRows: {
        ru: 'Сколько первых строк остаются под шапкой при прокрутке. Выделение, правка и копирование работают с ними как с остальными. Нужен `height`; с группами, деревом, деталями и `source` не работает.',
        en: 'Number of first rows that stay under the header while scrolling. Selection, editing and copying treat them like other rows. Needs `height`; does not work with groups, a tree, details or `source`.',
      },
      rowDrag: {
        ru: 'Добавляет ручку перетаскивания в начало каждой строки: строку ставят перед другой, после неё или вкладывают, задержав над серединой. Новый порядок приходит в событии `reorder`, а переставляет строки приложение. Ручки не работают с `source` и `remote`, при загрузке, сортировке, фильтрах, поиске и группировке.',
        en: 'Adds a drag grip at the start of every row: a row drops before another, after it, or inside it when held over the middle. The new order arrives in the `reorder` event, and the app moves the rows. The grips are off with `source` or `remote` and while the table loads, sorts, filters, searches or groups.',
      },
      nestDelay: {
        ru: 'Сколько миллисекунд держать строку над серединой другой, чтобы вложить в неё. По умолчанию 600.',
        en: 'Milliseconds to hold a row over the middle of another before it nests inside. 600 by default.',
      },
      dragLabel: {
        ru: 'Возвращает подпись ручки строки для экранных дикторов. По умолчанию — «Перетащить строку» с подписью строки из словаря.',
        en: 'Returns the row grip label for screen readers. Defaults to "Drag row" with the row label from the dictionary.',
      },
      rowLabel: {
        ru: 'Возвращает подпись строки для перетаскиваемой копии и объявлений дикторов. По умолчанию — текст первой текстовой колонки, а без неё — первой колонки.',
        en: 'Returns the row label for the drag preview and screen reader announcements. Defaults to the first text column, or the first column without one.',
      },
      cellSelection: {
        ru: 'Включает выделение ячеек мышью и клавиатурой и меню ячейки. Без него в таблице выделяется обычный текст, а с ним текст ячейки выделяется после двойного клика по ней. Правка колонок с `editable` работает и без него.',
        en: 'Enables selecting cells with the mouse and the keyboard, and the cell menu. Without it the table keeps plain text selection; with it the text of a cell can be selected after a double click on it. Editing `editable` columns works without it.',
      },
      contextMenu: {
        ru: 'Добавляет свои пункты в меню ячейки. Функция получает строку, колонку, значение, текст и выделение, её пункты идут после копирования. `false` оставляет меню браузера; без свойства меню есть только с `cellSelection`.',
        en: 'Adds custom items to the cell menu. The function receives the row, column, value, text and ranges, and its items follow the copy items. `false` keeps the browser menu; without the prop the menu shows only with `cellSelection`.',
      },
      copyLimit: {
        ru: 'Сколько ячеек можно скопировать за раз. По умолчанию 200 000. Строки сверх предела отбрасываются, и диктор сообщает об этом.',
        en: 'Maximum number of cells in one copy. 200,000 by default. Rows past the limit are dropped, and screen readers announce it.',
      },
      clipboard: {
        ru: 'Задаёт свой формат буфера обмена. `serialize({ ranges, rows, cols, headers, rowAt, keyAt }) → { text, html }` заменяет копирование и вырезание. `parse(data, target)` получает текст и HTML вставки и возвращает блок строк, а ответ `undefined` оставляет разбор таблице.',
        en: 'Sets a custom clipboard format. `serialize({ ranges, rows, cols, headers, rowAt, keyAt }) → { text, html }` replaces copy and cut. `parse(data, target)` receives the pasted text and HTML and returns a block of strings, and `undefined` leaves parsing to the table.',
      },
      commands: {
        ru: 'Подключает свою историю правок вместо встроенной. `push(command)` получает каждую правку, а Ctrl+Z, Ctrl+Y и методы `undo` и `redo` вызывают `undo()` и `redo()`, которые возвращают число изменённых ячеек.',
        en: 'Replaces the built-in edit history with your own. `push(command)` receives every edit. Ctrl+Z, Ctrl+Y and the `undo` and `redo` methods call its `undo()` and `redo()`, which return the number of changed cells.',
      },
      controls: {
        ru: 'Реестр контролов для ключей `editor` в колонках. По умолчанию берётся из `createNuiConfig({ controls })`.',
        en: 'Control registry for the `editor` keys of columns. Defaults to the one from `createNuiConfig({ controls })`.',
      },
      columnMenu: {
        ru: 'Меню колонки в шапке: сортировка, фильтр, группировка, закрепление и скрытие колонок. Функция `({ column, anchor }) → пункты` добавляет свои пункты в начало; `anchor` — ячейка шапки, к которой можно привязать свой поповер. `false` убирает кнопку меню, и Alt+ArrowDown открывает фильтр.',
        en: 'Column menu in the header: sorting, filter, grouping, pinning and hiding columns. A function `({ column, anchor }) → entries` adds its own entries first; `anchor` is the header cell to attach your own popover to. `false` removes the menu button, and Alt+ArrowDown opens the filter.',
      },
    },
    models: {
      'v-model:sort': {
        ru: 'Сортировка: список ключей колонок с направлением. Первый ключ — главный.',
        en: 'Sorting: a list of column keys with directions. The first key comes first.',
      },
      'v-model:filters': {
        ru: 'Фильтры колонок: условия `text`, `number`, `date` и `set` по ключам колонок. Условие `set` с `exclude: true` прячет строки названных значений. Значение можно сохранить в JSON.',
        en: 'Column filters: `text`, `number`, `date` and `set` conditions by column key. A `set` condition with `exclude: true` hides the rows of the named values. The value can be saved as JSON.',
      },
      'v-model:quick': {
        ru: 'Текст поиска по всем видимым текстовым колонкам без учёта регистра.',
        en: 'Search text matched against every visible text column, ignoring case.',
      },
      'v-model:groupBy': {
        ru: 'Ключи колонок для группировки по уровням. Непустой список собирает строки в раскрывающиеся группы.',
        en: 'Column keys to group by, one per level. A non-empty list gathers the rows into expandable groups.',
      },
      'v-model:expanded': {
        ru: 'Id раскрытых групп, строк дерева и деталей. По умолчанию всё свёрнуто.',
        en: 'Ids of expanded groups, tree rows and details. Everything starts collapsed.',
      },
      'v-model:pins': {
        ru: 'Закрепление колонок из меню: ключ колонки → `start`, `end` или `null`. Значение модели сильнее `pin` колонки, а без ключа действует `pin`. Если закреплённым колонкам не хватает места, прокручиваются все колонки, а модель не меняется.',
        en: 'Column pinning from the menu: column key → `start`, `end` or `null`. The model wins over the column `pin`, and a missing key keeps `pin`. When pinned columns leave no room, every column scrolls and the model stays as it is.',
      },
      'v-model:page': {
        ru: 'Текущая страница, начиная с 1. Если строк стало меньше, номер уменьшается до последней страницы.',
        en: 'Current page, starting from 1. When the rows shrink, it drops to the last page.',
      },
      'v-model:pageSize': {
        ru: 'Число строк на странице. По умолчанию 20.',
        en: 'Number of rows per page. 20 by default.',
      },
      'v-model:selected': {
        ru: 'Выбранные строки — сами объекты из `rows`. Сравниваются по `getKey`, а без него — по ссылке.',
        en: 'Selected rows, as the objects from `rows`. Compared by `getKey`, or by reference without it.',
      },
      'v-model:widths': {
        ru: 'Ширины колонок в пикселях по ключу, заданные вручную. Колонка из модели больше не делит свободное место через `flex`, а двойной клик по ручке убирает её из модели.',
        en: 'Column widths in pixels by key, set by hand. A column in the model stops sharing free space through `flex`, and a double click on the handle removes it from the model.',
      },
      'v-model:rowHeights': {
        ru: 'Высоты строк в пикселях по ключу строки, заданные вручную; ручку включает `rowHeaders.resizable`. С `height` и числовой `rowHeight` высота точная, иначе это минимум. С `source` не действует.',
        en: 'Row heights in pixels by row key, set by hand; `rowHeaders.resizable` adds the handle. With `height` and a numeric `rowHeight` the height is exact, otherwise it is a minimum. No effect with `source`.',
      },
      'v-model:columnOrder': {
        ru: 'Порядок колонок после перестановки. Ключи из модели идут первыми, остальные — в порядке объявления. Колонку переставляют за ручку в начале заголовка внутри её закреплённой или прокручиваемой части.',
        en: 'Column order after a move. Keys in the model come first, the rest follow the declaration order. A column moves by the grip at the start of its header, within its pinned or scrolling part.',
      },
      'v-model:ranges': {
        ru: 'Выделенные прямоугольники ячеек `{ from, to }`: `row` — позиция строки на странице, `col` — позиция среди видимых колонок. Новый прямоугольник вырезается из прежних, а Ctrl+клик по выделенной ячейке снимает с неё выделение. Сбрасывается при сортировке, фильтрах, группировке и смене страницы, колонок или строк.',
        en: 'Selected cell rectangles `{ from, to }`: `row` is the row position on the page, `col` the position among visible columns. A new rectangle is cut out of the earlier ones, and Ctrl+click on a selected cell deselects it. Resets on sorting, filters, grouping and changes of the page, columns or rows.',
      },
      'v-model:active': {
        ru: 'Активная ячейка в координатах `ranges`; `undefined`, пока курсор в шапке, подвале или служебной колонке. Запись переносит курсор и прокручивает к ячейке, а фокус переходит, только если он уже в таблице.',
        en: 'Active cell in `ranges` coordinates; `undefined` while the cursor is in the header, the footer or a utility column. Writing it moves the cursor and scrolls to the cell, and focus follows only when it is already in the table.',
      },
      'v-model:draft': {
        ru: 'Черновик открытого редактора: `{ row, col, key, value }`, где `value` — текущее значение контрола; `undefined`, пока правки нет. Запись для той же ячейки меняет значение в редакторе, поэтому строка формул и ячейка показывают одно и то же.',
        en: 'Draft of the open editor: `{ row, col, key, value }`, where `value` is the current value of the control; `undefined` while nothing is edited. Writing it for the same cell changes the editor value, so a formula bar and the cell show the same text.',
      },
      'v-model:hidden': {
        ru: 'Ключи скрытых колонок. Скрытая колонка не показывается и пропускается клавиатурой, но её фильтры и сортировка продолжают работать.',
        en: 'Keys of hidden columns. A hidden column is not shown and is skipped by the keyboard, but its filters and sorting keep working.',
      },
    },
    events: {
      error: {
        ru: 'Запрос к `source` не удался. Строки блока остаются скелетонами, а `refresh()` загружает их снова.',
        en: 'A `source` request failed. The rows of the block stay skeletons, and `refresh()` loads them again.',
      },
      progress: {
        ru: 'Ход долгой обработки строк: этап, сколько сделано и сколько всего.',
        en: 'Progress of a long run over the rows: the phase, done and total.',
      },
      settle: {
        ru: 'Сортировка или фильтрация закончилась. Передаёт число строк.',
        en: 'Sorting or filtering finished. Carries the row count.',
      },
      load: {
        ru: 'Раскрыта строка, чьи дети ещё не загружены. Строка ждёт их, пока не обновятся `rows`.',
        en: 'A row with unloaded children expanded. The row waits for them until `rows` update.',
      },
      rowClick: {
        ru: 'Клик по строке данных, кроме флажка, ручки, подписи группы и переключателя дерева. Передаёт строку и событие мыши.',
        en: 'Click on a data row outside the checkbox, the grip, the group label and the tree toggle. Carries the row and the mouse event.',
      },
      reorder: {
        ru: 'Строку перетащили. Передаёт `row`, прежние индекс `from` и родителя `parent`, новые индекс `to` и родителя `toParent`; индексы считаются среди соседей, `undefined` — корень. Порядок в данных меняете вы.',
        en: 'A row was dragged. Carries `row`, the old index `from` and parent `parent`, and the new index `to` and parent `toParent`; indices count among siblings, `undefined` is the root. You apply the order to the data.',
      },
      columnResize: {
        ru: 'Ширину колонки поменяли: перетаскивание закончилось, сделан шаг с клавиатуры или ширина сброшена. Передаёт список `{ key, width }`; `width: undefined` значит сброс. Во время перетаскивания меняется только `v-model:widths`.',
        en: 'A column width changed: a drag ended, a keyboard step was made or the width was reset. Carries a list of `{ key, width }`; `width: undefined` means a reset. During a drag only `v-model:widths` changes.',
      },
      columnFit: {
        ru: 'Двойной клик по краю заголовка колонки, до сброса ширины. Передаёт `{ key, preventDefault }`: после `preventDefault()` таблица не сбрасывает ширину и не объявляет сброс — ширину ставит владелец.',
        en: 'A double click on the edge of a column header, before the width is reset. Carries `{ key, preventDefault }`: after `preventDefault()` the table neither resets the width nor announces a reset, and the owner sets the width.',
      },
      rowResize: {
        ru: 'Высоту строки поменяли: перетаскивание закончилось, сделан шаг с клавиатуры или высота сброшена. Передаёт список `{ key, height }`, где `key` — ключ строки строкой; `height: undefined` значит сброс. Во время перетаскивания меняется только `v-model:rowHeights`.',
        en: 'A row height changed: a drag ended, a keyboard step was made or the height was reset. Carries a list of `{ key, height }` with the row key as a string; `height: undefined` means a reset. During a drag only `v-model:rowHeights` changes.',
      },
      editRefused: {
        ru: 'Редактор ячейки не открылся или закрылся без записи; передаёт `row`, `key` и `reason`. Причина `control` — контрола нет в реестре, `props` — свойства не прошли проверку, `value` — значение не подходит контролу. `row-gone` значит, что в новых `rows` нет строки открытого редактора.',
        en: 'A cell editor did not open or closed without saving; it carries `row`, `key` and `reason`. `control` means the registry lacks the control, `props` that the props fail the check, `value` that the value does not fit. `row-gone` means the new `rows` no longer hold the row of the open editor.',
      },
      pick: {
        ru: 'Выбрана ссылка для формулы, пока `picking` отвечает `true`. Передаёт диапазон, расширенный до объединённых ячеек; вставляет его в черновик приложение.',
        en: 'A formula reference was picked while `picking` returns `true`. Carries the range grown to merged cells; the app inserts it into the draft.',
      },
      window: {
        ru: 'Изменился набор отрисованных строк и колонок. `rows` и `cols` — диапазоны позиций `{ start, end }`, `end` не входит.',
        en: 'The set of rendered rows and columns changed. `rows` and `cols` are position spans `{ start, end }`, `end` excluded.',
      },
      edit: {
        ru: 'Ячейки изменили: передаёт `kind` (`edit`, `clear`, `cut`, `paste`, `undo`, `redo`) и `changes` со строкой, ключом колонки, новым и прежним значением. У вставки блока есть `area` — диапазон, который он занял; у одного значения, вставленного в выделение, его нет. Таблица сама строки не меняет — примените изменения к данным.',
        en: 'Fires when cells change and carries `kind` (`edit`, `clear`, `cut`, `paste`, `undo`, `redo`) and `changes` with the row, column key, new and previous value. A pasted block also carries `area`, the range it took; one value pasted into a selection has none. The table never changes rows itself, so apply the changes to your data.',
      },
    },
    slots: {
      empty: { ru: 'Содержимое пустой таблицы.', en: 'Content of an empty table.' },
      loading: {
        ru: 'Содержимое вместо строк-скелетонов во время загрузки.',
        en: 'Content shown instead of skeleton rows while loading.',
      },
      caption: {
        ru: 'Подпись над таблицей вместо свойства `caption`.',
        en: 'Caption above the table in place of the `caption` prop.',
      },
      overlay: {
        ru: 'Свой слой поверх ячеек, который прокручивается вместе с ними. Слот рисуется в прокручиваемой части и в каждой закреплённой и получает её имя `pane`, `rectOf(range) → { top, start, width, height }` и `window`. Клики проходят сквозь слой, пока элементу не задан `pointer-events: auto`.',
        en: 'A custom layer over the cells that scrolls with them. The slot renders in the scrolling part and in each pinned one with its `pane` name, `rectOf(range) → { top, start, width, height }` and `window`. Clicks pass through the layer until an element sets `pointer-events: auto`.',
      },
      detail: {
        ru: 'Деталь раскрытой строки на всю ширину таблицы. Получает строку и её позицию. В дереве строк не работает.',
        en: 'Detail of an expanded row across the full width of the table. Receives the row and its position. Does not work in a row tree.',
      },
    },
    keyboard: [
      {
        keys: 'Enter / Space',
        description: {
          ru: 'На ячейке шапки переключает сортировку: по возрастанию, по убыванию, без сортировки.',
          en: 'On a header cell cycles the sort: ascending, descending, none.',
        },
      },
      {
        keys: 'Shift+Enter',
        description: {
          ru: 'На ячейке шапки добавляет колонку следующим ключом сортировки.',
          en: 'On a header cell adds the column as the next sort key.',
        },
      },
      {
        keys: 'Enter / Space',
        description: {
          ru: 'С `rowHeaders` выделяет строку на её заголовке, колонку — на заголовке без сортировки, все ячейки — на угловой ячейке.',
          en: 'With `rowHeaders`, selects the row on its header, the column on a header without sorting, and every cell on the corner cell.',
        },
      },
      {
        keys: 'Enter / Space',
        description: {
          ru: 'На строке группы или в колонке дерева раскрывает и сворачивает строку или её деталь.',
          en: 'On a group row or in the tree column expands or collapses the row or its detail.',
        },
      },
      {
        keys: 'Tab / Shift+Tab',
        description: {
          ru: 'На ячейке детали переводит фокус в её содержимое и обратно. Внутри детали клавиши таблицы не работают.',
          en: 'On a detail cell moves focus into its content and back. Table keys do not work inside a detail.',
        },
      },
      {
        keys: 'Space',
        description: {
          ru: 'С `selectable` выбирает строку или снимает выбор. На флажке в шапке — все показанные строки.',
          en: 'With `selectable`, selects or deselects the row. On the header checkbox, every shown row.',
        },
      },
      {
        keys: 'Alt+ArrowLeft / Alt+ArrowRight',
        description: {
          ru: 'На ячейке шапки сужает или расширяет колонку на 10 px. В RTL стрелки меняются местами.',
          en: 'On a header cell narrows or widens the column by 10 px. In RTL the arrows swap.',
        },
      },
      {
        keys: 'Alt+ArrowUp / Alt+ArrowDown',
        description: {
          ru: 'С `rowHeaders.resizable` на заголовке строки уменьшает или увеличивает её высоту на 8 px.',
          en: 'With `rowHeaders.resizable`, on a row header makes the row 8 px lower or taller.',
        },
      },
      {
        keys: 'Alt+Shift+ArrowLeft / Alt+Shift+ArrowRight',
        description: {
          ru: 'На ячейке шапки сдвигает колонку на одну позицию, фокус остаётся на ней. В RTL стрелки меняются местами.',
          en: 'On a header cell moves the column one position and keeps focus on it. In RTL the arrows swap.',
        },
      },
      {
        keys: 'Alt+Shift+ArrowUp / Alt+Shift+ArrowDown',
        description: {
          ru: 'С `rowDrag` сдвигает строку вверх или вниз среди соседей, фокус идёт за строкой.',
          en: 'With `rowDrag`, moves the row up or down among its siblings; focus follows the row.',
        },
      },
      {
        keys: 'Alt+Shift+ArrowRight / Alt+Shift+ArrowLeft',
        description: {
          ru: 'Вкладывает строку в предыдущую соседнюю или выносит её следом за родителем. В RTL стрелки меняются местами.',
          en: 'Nests the row into the previous sibling or moves it out after its parent. In RTL the arrows swap.',
        },
      },
      {
        keys: 'Shift+Arrow / Shift+Home / Shift+End',
        description: {
          ru: 'Растягивает выделение от активной ячейки. С Ctrl — до края данных из `nextEdge` или до края таблицы.',
          en: 'Extends the selection from the active cell. With Ctrl, to the edge of the data from `nextEdge` or of the table.',
        },
      },
      {
        keys: 'Shift+Space / Ctrl+Space / Ctrl+A',
        description: {
          ru: 'Выделяет целые строки выделения, целые его колонки или все ячейки страницы. Escape снимает выделение и подсветку активной ячейки.',
          en: 'Selects the whole rows of the selection, its whole columns or every cell of the page. Escape clears the selection and the active cell highlight.',
        },
      },
      {
        keys: 'Ctrl+C',
        description: {
          ru: 'Копирует выделение или активную ячейку текстом с табуляциями и HTML-таблицей.',
          en: 'Copies the selection or the active cell as tab separated text and an HTML table.',
        },
      },
      {
        keys: 'Enter / F2',
        description: {
          ru: 'На изменяемой ячейке открывает редактор, а ввод символа открывает его с этим символом. Ячейку `boolean` переключает сразу.',
          en: 'On an editable cell opens the editor, and typing opens it with the typed character. A `boolean` cell toggles at once.',
        },
      },
      {
        keys: 'Enter / Shift+Enter',
        description: {
          ru: 'В редакторе сохраняет значение и переходит на строку ниже или выше. Неверное значение остаётся в редакторе с ошибкой.',
          en: 'In the editor saves the value and moves one row down or up. An invalid value stays in the editor with its error.',
        },
      },
      {
        keys: 'Tab / Shift+Tab',
        description: {
          ru: 'В редакторе сохраняет значение и переходит в следующую или предыдущую колонку.',
          en: 'In the editor saves the value and moves to the next or the previous column.',
        },
      },
      {
        keys: 'Arrow / Shift+Arrow',
        description: {
          ru: 'В редакторе, пока `picking` отвечает `true`, выбирают ссылку на ячейку, а с Shift растягивают её.',
          en: 'In the editor, while `picking` returns `true`, pick a cell reference; with Shift they stretch it.',
        },
      },
      {
        keys: 'Ctrl+Enter',
        description: {
          ru: 'В редакторе записывает значение во все изменяемые ячейки выделения того же типа. Курсор остаётся на месте.',
          en: 'In the editor writes the value into every editable cell of the selection with the same type. The cursor stays in place.',
        },
      },
      {
        keys: 'Escape',
        description: {
          ru: 'В редакторе отменяет правку и возвращает фокус в ячейку.',
          en: 'In the editor cancels the edit and returns focus to the cell.',
        },
      },
      {
        keys: 'Delete / Backspace',
        description: {
          ru: 'Очищает изменяемые ячейки выделения или активную ячейку.',
          en: 'Clears the editable cells of the selection or the active cell.',
        },
      },
      {
        keys: 'Ctrl+X',
        description: {
          ru: 'Вырезает выделение: копирует его и очищает изменяемые ячейки.',
          en: 'Cuts the selection: copies it and clears the editable cells.',
        },
      },
      {
        keys: 'Ctrl+V',
        description: {
          ru: 'Вставляет блок из буфера начиная с активной ячейки. Одно значение заполняет всё выделение.',
          en: 'Pastes a block from the clipboard starting at the active cell. A single value fills the whole selection.',
        },
      },
      {
        keys: 'Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y',
        description: {
          ru: 'Отменяет последнюю правку или возвращает отменённую.',
          en: 'Undoes the last edit or redoes an undone one.',
        },
      },
      {
        keys: 'Shift+F10 / ContextMenu',
        description: {
          ru: 'Открывает меню ячейки на первом пункте. Escape возвращает фокус в ячейку.',
          en: 'Opens the cell menu on its first item. Escape returns focus to the cell.',
        },
      },
      {
        keys: 'Alt+ArrowDown',
        description: {
          ru: 'На ячейке шапки открывает меню колонки, а без меню — фильтр. Escape закрывает их и возвращает фокус в шапку.',
          en: 'On a header cell opens the column menu, or the filter without a menu. Escape closes them and returns focus to the header.',
        },
      },
      {
        keys: 'ArrowUp / ArrowDown',
        description: {
          ru: 'Переходит на строку выше или ниже. Над первой строкой — шапка.',
          en: 'Moves to the row above or below. The header sits above the first row.',
        },
      },
      {
        keys: 'ArrowLeft / ArrowRight',
        description: {
          ru: 'Переходит в соседнюю колонку. В RTL стрелки меняются местами.',
          en: 'Moves to the neighboring column. In RTL the arrows swap.',
        },
      },
      {
        keys: 'Home / End',
        description: {
          ru: 'Переходит на первую колонку данных или на последнюю колонку строки. Повторный Home из первой колонки данных ведёт в колонку выбора или номеров строк.',
          en: 'Moves to the first data column or to the last column of the row. Home pressed again in the first data column leads to the selection or row number column.',
        },
      },
      {
        keys: 'Ctrl+Arrow',
        description: {
          ru: 'Переходит к краю таблицы, а с `nextEdge` — к краю данных, как в электронных таблицах.',
          en: 'Moves to the edge of the table, or with `nextEdge` to the edge of the data, as spreadsheets do.',
        },
      },
      {
        keys: 'Ctrl+Home / Ctrl+End',
        description: {
          ru: 'Переходит на первую ячейку данных или на последнюю ячейку, включая строку итогов. С `lastCell` Ctrl+End ведёт в ячейку, которую назвала функция.',
          en: 'Moves to the first data cell or to the last cell, the totals row included. With `lastCell`, Ctrl+End goes to the cell the function names.',
        },
      },
      {
        keys: 'PageUp / PageDown',
        description: {
          ru: 'Переходит на экран строк вверх или вниз. Экран — строки тела, которые помещаются между шапкой с закреплёнными строками и строкой итогов.',
          en: 'Moves a screen of rows up or down. A screen is the body rows that fit between the header with its pinned rows and the totals row.',
        },
      },
    ],
  },
  NuiTablePeers: {
    props: {
      peers: {
        ru: 'Соавторы в таблице: рамка ячейки с флажком имени и заливка выделенных диапазонов. Цвет — один из восьми по номеру `colour`.',
        en: 'Co-authors in the table: a cell frame with a name flag and a fill over the selected ranges. The color is one of eight, picked by `colour`.',
      },
      rectOf: {
        ru: 'Прямоугольник диапазона в слое таблицы. Диапазон без прямоугольника, например вне отрисованных строк, не рисуется.',
        en: 'Rectangle of a range in the table layer. A range without one, such as one outside the rendered rows, is not drawn.',
      },
    },
  },
};

export default docs;
