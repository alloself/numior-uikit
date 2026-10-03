import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiTable: {
    props: {
      columns: {
        ru: "Колонки: key, label, type (text, number, date, boolean), value, format, width, minWidth, maxWidth, resizable, reorderable, pin, align, sortable, filter, hideable, wrap, flex, aggregate, editable, parse, rules и editor. hideable: false не даёт скрыть колонку из меню; resizable: false убирает ручку ширины и клавиши Alt+стрелки, reorderable: false — ручку перетаскивания и Alt+Shift+стрелки, minWidth и maxWidth ограничивают ширину при перетаскивании; wrap: true переносит текст ячейки, а без height строка растёт по нему; flex делит свободную ширину области прокрутки между колонками пропорционально, пока колонку не растянули вручную. filter выбирает вид фильтра (text, number, date, set) или выключает его значением false. aggregate считает значение для строк групп и строки итогов: у числовой колонки sum, count, avg, min, max или функция, у даты min, max, count или функция, у текстовой и булевой count или функция. Вне строки, например в группе или списке значений фильтра, format получает строку как undefined. Группа { key, label, children } рисует над заголовками своих колонок полосу с подписью. editable (true или функция строки) открывает ячейки колонки для правки в редакторе, очистки, вырезания и вставки, а правки приходят событием edit. parse(text, row) переводит вставленный текст в значение колонки и отклоняет ячейку ответом undefined; без него число, дата и булево значение разбираются по типу колонки. rules — правила @numior/forms: они проверяют значение перед сохранением правки, вставкой и очисткой. editor задаёт свой редактор: tableEditor(Компонент, проверка, { props }) или ключ реестра контролов ('select' либо { control, props }); у колонки дат редактор работает со строкой ISO.",
        en: "Columns: key, label, type (text, number, date, boolean), value, format, width, minWidth, maxWidth, resizable, reorderable, pin, align, sortable, filter, hideable, wrap, flex, aggregate, editable, parse, rules and editor. hideable: false keeps the column out of reach of the menu hide; resizable: false drops the width handle and the Alt+arrow keys, reorderable: false the drag grip and the Alt+Shift+arrow keys, minWidth and maxWidth bound the width while dragging; wrap: true wraps the cell text, and without height the row grows with it; flex shares the free width of the scroll area between columns in proportion until the column is resized by hand. filter picks the filter kind (text, number, date, set) or turns it off with false. aggregate fills group rows and the totals row: a number column takes sum, count, avg, min, max or a function, a date column min, max, count or a function, a text or boolean column count or a function. Outside a row, such as a group or the filter value list, format receives the row as undefined. A group { key, label, children } draws a labelled band above the headers of its columns. editable (true or a function of the row) opens the cells of the column to the editor, clearing, cutting and pasting, and the changes arrive in the edit event. parse(text, row) turns pasted text into the column value and refuses the cell by returning undefined; without it a number, a date or a boolean is read by the column type. rules are @numior/forms rules that check the value before an edit, a paste or a clear is saved. editor sets an editor of its own: tableEditor(Component, guard, { props }) or a control registry key ('select' or { control, props }); a date column editor works with an ISO string.",
      },
      rows: {
        ru: 'Строки таблицы; она их не копирует и не меняет. С source не нужны.',
        en: 'Rows of the table; it neither copies nor changes them. Not needed with source.',
      },
      source: {
        ru: 'Серверный источник: fetch({ offset, limit, sort, filters, groupBy, groupPath, signal }) возвращает { rows, total } или { rows, hasMore }, а необязательные values и totals дают значения фильтра-списка и итоги. С groupBy таблица просит уровень групп: пока groupPath короче groupBy, fetch возвращает { groups } со значением value, числом строк count и агрегатами aggregates, а на последнем уровне — строки группы. Таблица грузит блоки под окном прокрутки, держит в кеше пятьдесят последних блоков и отменяет старые запросы при смене сортировки, фильтров и групп; без height она листает источник страницами. Необязательный children({ row, sort, filters, signal }) возвращает детей строки и включает дерево: строки с детьми отмечает hasChildren, а группировка в дереве выключена. Перетаскивание строк с source не работает.',
        en: 'Server source: fetch({ offset, limit, sort, filters, groupBy, groupPath, signal }) returns { rows, total } or { rows, hasMore }, while the optional values and totals give the set filter values and the totals. With groupBy the table asks for a level of groups: while groupPath is shorter than groupBy, fetch returns { groups } with the value, the row count and the aggregates of each group, and at the last level the rows of the group. The table loads blocks under the scroll window, keeps the last fifty blocks in a cache and cancels old requests when sorting, filters or groups change; without height it pages through the source. The optional children({ row, sort, filters, signal }) returns the children of a row and turns the tree on: hasChildren marks the rows with children, and grouping is off in a tree. Row drag does not work with source.',
      },
      blockSize: {
        ru: 'Строк в одном запросе к source; по умолчанию 100, а при пагинации — размер страницы.',
        en: 'Rows in one source request; 100 by default and the page size with pagination.',
      },
      getKey: {
        ru: 'Устойчивый ключ строки; без него ключом служит индекс в rows.',
        en: 'Stable row key; without it the index in rows is the key.',
      },
      id: {
        ru: 'Идентификатор элемента с ролью grid; по умолчанию генерируется.',
        en: 'Id of the element with the grid role; generated by default.',
      },
      size: {
        ru: 'Плотность: отступы, шрифт и высота строки по умолчанию.',
        en: 'Density: paddings, font and the default row height.',
      },
      rowHeight: {
        ru: 'Высота строки в пикселях; по умолчанию 32, 40 или 48 по размеру. Без height это минимальная высота: строка растёт по содержимому. Значение auto вместе с height измеряет строки окна: строка растёт по содержимому, а колонки с wrap переносят текст.',
        en: 'Row height in pixels; 32, 40 or 48 by size by default. Without height it is the minimum: a row grows with its content. The value auto together with height measures the rows of the window: a row grows with its content, and columns with wrap break their text.',
      },
      height: {
        ru: 'Высота области прокрутки в единицах CSS: с ней строки и колонки рисуются окнами по rowHeight и ширинам, без неё таблица растёт по строкам и рисует все строки и колонки.',
        en: 'Height of the scroll area in CSS units: with it rows and columns render in windows by rowHeight and widths, without it the table grows with its rows and renders every row and column.',
      },
      locale: {
        ru: 'Локаль для чисел и дат; по умолчанию из конфигурации.',
        en: 'Locale for numbers and dates; the configuration supplies the default.',
      },
      label: {
        ru: 'Доступное имя таблицы; по умолчанию из словаря.',
        en: 'Accessible name of the table; the dictionary supplies the default.',
      },
      emptyLabel: {
        ru: 'Текст пустой таблицы; по умолчанию из словаря.',
        en: 'Text of the empty table; the dictionary supplies the default.',
      },
      getChildren: {
        ru: 'Дочерние строки для данных-дерева; включает роль treegrid и игнорирует groupBy.',
        en: 'Child rows for tree data; turns on the treegrid role and ignores groupBy.',
      },
      hasChildren: {
        ru: 'Отмечает строку, чьи дети ещё не загружены: её можно раскрыть, и таблица вызовет событие load. С source отмечает строки, детей которых отдаёт source.children; событие load тогда не приходит.',
        en: 'Marks a row whose children are not loaded yet: it can expand, and the table emits load. With source it marks the rows whose children source.children returns; the load event does not fire then.',
      },
      hasDetail: {
        ru: 'Отмечает строки, у которых есть деталь: остальные остаются без переключателя. Без функции деталь есть у каждой строки, пока задан слот detail.',
        en: 'Marks the rows that have a detail: the others get no toggle. Without the function every row has a detail while the detail slot is set.',
      },
      cellStyle: {
        ru: 'Оформление ячейки тела и закреплённых строк: функция получает { row, column, position, pinned } и возвращает fill, color, align, wrap, overflow, borders, class и style либо undefined. fill ложится поверх фона строки и под выделение. wrap переносит текст одной ячейки, как wrap колонки. overflow продолжает текст в одну строку поверх пустых ячеек после неё, а при выравнивании к концу — перед ней, до первой непустой ячейки, объединения или края закреплённой панели; центрированный текст, текст в закреплённой колонке и ячейка со своим слотом остаются в своих границах. borders рисует линии top, end, bottom и start поверх сетки и не меняет высоту строки: end и bottom встают на линии сетки, top и start — внутри ячейки. Функция вызывается один раз на показанную ячейку и снова, когда меняется строка или реактивное состояние, которое она читает.',
        en: 'Style of a body or pinned row cell: the function takes { row, column, position, pinned } and returns fill, color, align, wrap, overflow, borders, class and style, or undefined. fill lies over the row background and under the selection. wrap breaks the text of a single cell, like wrap of a column. overflow carries a one-line text over the empty cells after it, or before it when it is end aligned, up to the first filled cell, a merge or the edge of a pinned pane; a centred text, a text in a pinned column and a cell with a slot of its own stay within their cell. borders draws the top, end, bottom and start lines over the grid and leaves the row height alone: end and bottom sit on the grid lines, top and start stay inside the cell. The function runs once per shown cell and again when the row or reactive state it reads changes.',
      },
      merges: {
        ru: 'Объединённые ячейки: прямоугольники from и to в координатах v-model:ranges, то есть позиция строки на странице и позиция среди видимых колонок данных. Объединение показывает содержимое и оформление своей первой ячейки, курсор и выделение берут его целиком, а правка меняет первую ячейку. Объединение из нескольких строк остаётся на фоне таблицы: наведение, полосы и выбор строки его не красят. Прямоугольники не должны пересекаться: из двух пересекающихся остаётся первый. При группировке, в дереве и с деталями объединения выключены.',
        en: 'Merged cells: from and to rectangles in the coordinates of v-model:ranges, that is the row position on the page and the position among the shown data columns. A merge shows the content and the style of its first cell, the cursor and a selection take it whole, and an edit changes the first cell. A merge of several rows stays on the table background: hover, stripes and row selection leave it alone. The rectangles must not overlap: of two that do, the first one stays. Merges are off with grouping, in a tree and with details.',
      },
      bordered: {
        ru: 'Рисует линии между колонками. Линия после последней колонки видна, только пока колонки уже области прокрутки.',
        en: 'Draws lines between the columns. The line after the last column shows only while the columns are narrower than the scroll area.',
      },
      rowHeaders: {
        ru: 'Закреплённая в начале колонка заголовков строк: true нумерует строки по порядку на экране, а { label, width, resizable } задаёт подпись label(row, position), ширину в пикселях и ручку высоты у нижнего края заголовка. Щелчок по заголовку выделяет строку, по углу — все ячейки, а по заголовку колонки с sortable: false — колонку; Shift продолжает выделение, Ctrl добавляет строку или колонку, протяжка берёт несколько подряд. Заголовки выделенных ячеек подсвечены. Выделение требует cellSelection.',
        en: 'Column of row headers pinned at the start: true numbers the rows in the order on screen, and { label, width, resizable } sets the label(row, position) text, the width in pixels and a height handle at the bottom edge of a header. A click on a header selects the row, on the corner every cell, and on the header of a column with sortable: false the column; Shift extends the selection, Ctrl adds a row or a column, a drag takes several in a row. The headers of selected cells are highlighted. The selection needs cellSelection.',
      },
      treeColumn: {
        ru: 'Ключ колонки с отступом и переключателем дерева или детали; по умолчанию первая колонка.',
        en: 'Key of the column with the tree indentation and the toggle of a tree row or a detail; the first column by default.',
      },
      totalsLabel: {
        ru: 'Подпись строки итогов в первой колонке без агрегата, рядом с ней число строк после фильтров; по умолчанию из словаря.',
        en: 'Label of the totals row in the first column without an aggregate, next to the count of filtered rows; the dictionary supplies the default.',
      },
      selectable: {
        ru: 'Выбор строк: single или multiple. Добавляет колонку с флажками в начале, в multiple — флажок «все» в шапке для строк на экране после фильтров; Space на ячейке строки переключает её.',
        en: 'Row selection: single or multiple. Adds a checkbox column at the start and, for multiple, a select-all checkbox in the header for the rows in view after filters; Space on a row cell toggles it.',
      },
      striped: {
        ru: 'Чередует фон нечётных строк по их позиции; окно строк и закреплённые строки не сбивают узор.',
        en: 'Shades odd rows by their position, so the row window and pinned rows keep the pattern.',
      },
      caption: {
        ru: 'Подпись над таблицей; без label она же становится доступным именем таблицы.',
        en: 'Caption above the table; without label it also names the table.',
      },
      loading: {
        ru: 'Внешняя загрузка данных: таблица помечена aria-busy, вместо строк — скелетоны или слот loading, флажок «все» отключён.',
        en: 'External data loading: the table is aria-busy, skeleton rows or the loading slot replace the data, and the select-all checkbox is disabled.',
      },
      loadingRows: {
        ru: 'Число строк-скелетонов во время загрузки; по умолчанию 5, а с height — столько, сколько помещается в области прокрутки.',
        en: 'Number of skeleton rows while loading; 5 by default, or as many as fit the scroll area with height.',
      },
      selectLabel: {
        ru: 'Доступное имя флажка строки; по умолчанию из словаря.',
        en: 'Accessible name of a row checkbox; the dictionary supplies the default.',
      },
      selectAllLabel: {
        ru: 'Доступное имя флажка «все» в шапке; по умолчанию из словаря.',
        en: 'Accessible name of the select-all checkbox; the dictionary supplies the default.',
      },
      pagination: {
        ru: 'Постраничный вывод: true или настройки NuiPagination без total и size. Страницы режут видимый после сортировки и фильтров список строк, футер с NuiPagination стоит под областью прокрутки, окно строк работает внутри страницы; нужны стили NuiPagination и NuiSelect.',
        en: 'Paging: true or NuiPagination options without total and size. Pages slice the rows visible after sorting and filters, the NuiPagination footer sits under the scroll area and the row window works inside the page; NuiPagination and NuiSelect styles are needed.',
      },
      remote: {
        ru: 'Серверный режим: движок не сортирует, не фильтрует и не группирует, модели только эмитятся, а rows считаются уже готовой страницей.',
        en: 'Remote mode: the engine neither sorts, filters nor groups, the models are only emitted and rows count as the ready page.',
      },
      total: {
        ru: 'Общее число строк для пагинации в серверном режиме; по умолчанию длина rows.',
        en: 'Total row count for the pagination in remote mode; the length of rows by default.',
      },
      pinnedRows: {
        ru: 'Строки, закреплённые под шапкой: не сортируются, не фильтруются и не режутся на страницы, участвуют в выборе и rowClick; их слоты ячеек получают pinned: true.',
        en: 'Rows pinned under the header: left out of sorting, filters and pages, part of selection and rowClick; their cell slots receive pinned: true.',
      },
      nextEdge: {
        ru: 'Край данных для Ctrl со стрелками: (from, direction) → позиция, куда перейти; позиции — как в ranges, direction — up, down, previous или next. Без него Ctrl со стрелкой ведёт к краю таблицы. Ответ вне таблицы прижимается к её краю.',
        en: 'Edge of the data for Ctrl with the arrows: (from, direction) → the position to move to; positions are as in ranges, direction is up, down, previous or next. Without it Ctrl with an arrow goes to the edge of the table. An answer outside the table is pulled to its edge.',
      },
      keepEditing: {
        ru: 'Элементы вне таблицы, фокус на которых не завершает правку ячейки, например строка формул: (target) → true. Когда фокус уходит из такого элемента, правку завершает приложение через commitEdit или cancelEdit.',
        en: 'Elements outside the table whose focus keeps a cell edit open, such as a formula bar: (target) → true. When focus leaves such an element, the app ends the edit with commitEdit or cancelEdit.',
      },
      picking: {
        ru: 'Выбор ссылок в формулу: (draft) → true, пока черновик открытой правки ждёт ссылку, например кончается оператором. Тогда нажатие и протяжка по ячейкам, касание и стрелки в редакторе ячейки не завершают правку, а шлют событие pick.',
        en: 'Reference picking for formulas: (draft) → true while the draft of the open edit waits for a reference, for example ends with an operator. Then pressing and dragging over cells, a tap and the arrows in the cell editor keep the edit open and send the pick event.',
      },
      frozenRows: {
        ru: 'Число первых строк тела, которые остаются под шапкой при прокрутке. Это строки данных: выделение, правка и копирование работают с ними как с остальными. Нужен height; группы, дерево, детали строк и source закрепление отключают.',
        en: 'How many first body rows stay under the header while the rest scroll. They are data rows: selection, editing and copying treat them like the others. Needs height; groups, a tree, row details and source turn freezing off.',
      },
      rowDrag: {
        ru: 'Ручка перетаскивания в первой колонке каждой строки: верхняя часть целевой строки ставит строку перед ней, нижняя — после, удержание над серединой вкладывает её внутрь; событие reorder несёт индексы и обоих родителей, а сама таблица строки не переставляет. Ручки отключены при сортировке, фильтрах, быстром фильтре, группировке, серверном режиме и загрузке.',
        en: 'A drag grip in the first column of every row: the top of a target row drops before it, the bottom after it, and holding over the middle nests inside; the reorder event carries the indices and both parents while the table itself never reorders rows. The grips are disabled under sorting, filters, the quick filter, grouping, remote mode and loading.',
      },
      nestDelay: {
        ru: 'Миллисекунды удержания строки над серединой другой строки до вложения в неё; по умолчанию 600.',
        en: 'Milliseconds to hold a row over the middle of another before it nests inside; 600 by default.',
      },
      dragLabel: {
        ru: 'Функция доступного имени ручки строки; по умолчанию из словаря с подписью строки.',
        en: 'Function that names the row grip; the dictionary with the row label supplies the default.',
      },
      rowLabel: {
        ru: 'Функция подписи строки для призрака и объявлений; по умолчанию текст первой текстовой колонки, а без неё — первой колонки данных.',
        en: 'Function that labels a row in the ghost and the announcements; the text of the first text column by default, or of the first data column without one.',
      },
      cellSelection: {
        ru: 'Выделение прямоугольников ячеек мышью и клавиатурой и меню ячейки; по умолчанию выключено, и таблица оставляет обычное выделение текста. Правка колонок с editable работает и без него.',
        en: 'Selection of cell rectangles with the mouse and the keyboard, plus the cell menu; off by default, so the table keeps the plain text selection. Editing columns with editable works without it.',
      },
      contextMenu: {
        ru: 'Пункты контекстного меню ячейки: функция получает строку, колонку, значение, текст и диапазоны, её пункты идут после копирования. false оставляет меню браузера; без свойства меню есть, только когда включено cellSelection.',
        en: 'Items of the cell context menu: the function receives the row, column, value, text and ranges, and its items follow the copy items. false keeps the browser menu; without the prop the menu shows only when cellSelection is on.',
      },
      copyLimit: {
        ru: 'Предел ячеек в одном копировании; по умолчанию 200 000, лишние строки отбрасываются с объявлением.',
        en: 'Limit of cells in one copy; 200,000 by default, the rows past it are dropped with an announcement.',
      },
      controls: {
        ru: 'Реестр контролов для ключей editor у колонок; без него таблица берёт реестр из createNuiConfig({ controls }).',
        en: 'Control registry for the editor keys of columns; without it the table takes the registry from createNuiConfig({ controls }).',
      },
      columnMenu: {
        ru: 'Меню колонки в шапке: сортировка, фильтр, группировка, закрепление, скрытие и список колонок. false убирает кнопку меню, и Alt+ArrowDown открывает фильтр.',
        en: 'Column menu in the header: sort, filter, grouping, pinning, hiding and the column list. false drops the menu button, and Alt+ArrowDown opens the filter.',
      },
    },
    models: {
      'v-model:sort': {
        ru: 'Сортировка: список ключей колонок с направлением; первый ключ главный.',
        en: 'Sort: a list of column keys with directions; the first key leads.',
      },
      'v-model:filters': {
        ru: 'Фильтры колонок: список условий text, number, date и set по ключам колонок; модель сериализуется в JSON.',
        en: 'Column filters: a list of text, number, date and set conditions by column key; the model serialises to JSON.',
      },
      'v-model:quick': {
        ru: 'Быстрый фильтр: текст, который ищется во всех видимых текстовых колонках без учёта регистра.',
        en: 'Quick filter: text searched in every shown text column, ignoring case.',
      },
      'v-model:groupBy': {
        ru: 'Группировка: ключи колонок по уровням; непустой список делает таблицу деревом (treegrid).',
        en: 'Grouping: column keys by level; a non-empty list turns the table into a treegrid.',
      },
      'v-model:expanded': {
        ru: 'Развёрнутые группы и строки дерева: их id; по умолчанию всё свёрнуто.',
        en: 'Expanded groups and tree rows by id; everything starts collapsed.',
      },
      'v-model:pins': {
        ru: 'Закрепление из меню: ключ колонки → start, end или null (не закреплять); побеждает pin колонки, отсутствующий ключ оставляет его. Если закреплённые панели не оставляют места хотя бы на одну колонку, все колонки прокручиваются, а модель не меняется.',
        en: 'Pinning from the menu: column key → start, end or null (unpinned); it beats the column pin, and a missing key keeps it. When the pinned panes leave no room for a single column, every column scrolls and the model stays as it is.',
      },
      'v-model:page': {
        ru: 'Текущая страница, с 1; при сокращении списка страница зажимается.',
        en: 'Current page, from 1; the page clamps when the list shrinks.',
      },
      'v-model:pageSize': {
        ru: 'Размер страницы; по умолчанию 20.',
        en: 'Page size; 20 by default.',
      },
      'v-model:selected': {
        ru: 'Выбранные строки как значения rows; ключ — getKey, без него сама строка.',
        en: 'Selected rows as values of rows, keyed by getKey or by identity without it.',
      },
      'v-model:widths': {
        ru: 'Ширины колонок в пикселях по ключу после ручного изменения: ручка у края заголовка тянет колонку, пока таблица помещается — ширина переходит к соседней колонке, при прокрутке растёт только сама колонка; колонка с ключом в модели перестаёт делить свободное место через flex.',
        en: 'Column widths in pixels by key after a manual resize: the handle at the header edge drags the column, while the table fits the width moves to the neighbouring column and once it scrolls only the column itself grows; a column with a key in the model stops sharing the free width through flex.',
      },
      'v-model:rowHeights': {
        ru: 'Высоты строк в пикселях по ключу строки (getKey, без него индекс в rows) после ручного изменения: ручку у нижнего края заголовка строки включает rowHeaders.resizable, двойной щелчок по ней возвращает высоту по умолчанию. С height и числовой rowHeight высота точная и учитывается в прокрутке; когда строки растут по содержимому, это минимум. С source модель не действует.',
        en: 'Row heights in pixels by the row key (getKey, or the index in rows without it) after a manual resize: rowHeaders.resizable turns on the handle at the bottom edge of a row header, and a double click on it brings the default height back. With height and a numeric rowHeight the height is exact and counts in the scroll; when rows grow with their content it is a minimum. The model has no effect with source.',
      },
      'v-model:columnOrder': {
        ru: 'Порядок колонок ключами после перестановки: ключи модели идут первыми в своём порядке, остальные — в порядке объявления. Ручка в начале заголовка тянет колонку внутри её панели, закрепление сильнее порядка.',
        en: 'Column order as keys after a move: the keys in the model come first in their order, the rest follow the declaration order. The grip at the start of a header drags the column inside its pane, and pinning wins over the order.',
      },
      'v-model:ranges': {
        ru: 'Выделенные прямоугольники ячеек: from и to с row — позицией строки на странице — и col — позицией среди видимых колонок данных. Прямоугольники не пересекаются: новый вырезается из прежних, а Ctrl на выделенной ячейке снимает с неё выделение. Сбрасываются при сортировке, фильтре, группировке, смене страницы, колонок и строк.',
        en: 'Selected cell rectangles: from and to with row as the position on the page and col as the position among the shown data columns. Rectangles never overlap: a new one is cut out of the earlier ones, and Ctrl on a selected cell takes it out. They reset on sorting, filtering, grouping and changes of the page, the columns and the rows.',
      },
      'v-model:active': {
        ru: 'Активная ячейка в координатах ranges: row — позиция строки на странице, col — позиция среди видимых колонок данных; undefined, пока курсор в шапке, подвале или служебной колонке. Запись переносит курсор и показывает ячейку, а фокус переходит, только если он уже в таблице.',
        en: 'Active cell in the coordinates of ranges: row is the position on the page, col the position among the shown data columns; undefined while the cursor is in the header, the footer or a utility column. Writing it moves the cursor and reveals the cell, and focus follows only when it is already in the table.',
      },
      'v-model:draft': {
        ru: 'Черновик открытого редактора: { row, col, key, value }, где row и col — ячейка в координатах ranges, а value — значение контрола; undefined, пока правки нет. Запись с той же ячейкой меняет значение в редакторе, поэтому строка формул и ячейка показывают один текст.',
        en: 'Draft of the open editor: { row, col, key, value }, where row and col name the cell in the coordinates of ranges and value is the value of its control; undefined while nothing is edited. Writing it for the same cell changes the value in the editor, so a formula bar and the cell show the same text.',
      },
      'v-model:hidden': {
        ru: 'Ключи скрытых колонок; скрытая колонка не рисуется и не участвует в навигации, но её фильтры и сортировка продолжают действовать.',
        en: 'Keys of hidden columns; a hidden column is neither drawn nor reachable by the keyboard, but its filters and sort keep working.',
      },
    },
    events: {
      error: {
        ru: 'Запрос к source не удался; строки блока остаются скелетонами, а refresh() у ссылки на таблицу грузит их снова.',
        en: 'A source request failed; the rows of the block stay skeletons, and refresh() of the table ref loads them again.',
      },
      progress: {
        ru: 'Прогресс долгого прогона: фаза, сделано и всего.',
        en: 'Progress of a long run: the phase, done and total.',
      },
      settle: {
        ru: 'Прогон сортировки или фильтра завершён; передаёт число строк.',
        en: 'A sort or filter run finished; carries the row count.',
      },
      load: {
        ru: 'Раскрыта строка с незагруженными детьми; строка ждёт их, пока rows не обновятся.',
        en: 'A row with unloaded children expanded; it waits for them until rows update.',
      },
      rowClick: {
        ru: 'Клик по строке данных вне флажка, ручки, подписи группы и переключателя дерева; передаёт строку и событие.',
        en: 'A click on a data row outside the checkbox, the grip, the group label and the tree toggle; carries the row and the event.',
      },
      reorder: {
        ru: 'Строку переместили: row, from — индекс среди соседей старого родителя parent, to — индекс среди соседей нового родителя toParent; undefined означает корень, порядок применяет потребитель.',
        en: 'A row was moved: row, from as the index among the siblings of the old parent, to as the index among the siblings of the new toParent; undefined means the root, the consumer applies the order.',
      },
      editRefused: {
        ru: 'Свой редактор колонки не открылся: row, key и reason — control (контрола нет в реестре), props (пропсы не прошли проверку реестра) или value (значение ячейки не подходит контролу).',
        en: 'The editor of a column did not open: row, key and reason, which is control (the registry has no such control), props (the props failed the registry check) or value (the cell value does not fit the control).',
      },
      pick: {
        ru: 'Выбрана ссылка, пока picking отвечает true: диапазон в координатах ranges, расширенный до объединённых ячеек. Вставляет её в черновик приложение.',
        en: 'A reference was picked while picking answers true: a range in the coordinates of ranges grown to merged cells. The app inserts it into the draft.',
      },
      window: {
        ru: 'Сменилось окно отрисовки: rows и cols — позиции отрисованных строк и колонок данных { start, end }, end не входит.',
        en: 'The rendered window changed: rows and cols are the positions of the rendered rows and data columns { start, end }, end excluded.',
      },
      edit: {
        ru: 'Правка ячеек: kind (edit, clear, cut, paste, undo, redo) и changes со строкой, ключом колонки, новым и прежним значением. Таблица строки не меняет, изменения применяет потребитель.',
        en: 'An edit of cells: kind (edit, clear, cut, paste, undo, redo) and changes with the row, the column key, the new and the previous value. The table never changes rows; the consumer applies the changes.',
      },
    },
    slots: {
      empty: { ru: 'Содержимое пустой таблицы.', en: 'Content of the empty table.' },
      loading: {
        ru: 'Содержимое вместо строк-скелетонов во время загрузки.',
        en: 'Content shown instead of skeleton rows while loading.',
      },
      caption: {
        ru: 'Подпись над таблицей вместо caption.',
        en: 'Caption above the table instead of caption.',
      },
      overlay: {
        ru: 'Слой поверх ячеек в координатах прокручиваемого содержимого: слот получает rectOf(range) → { top, start, width, height } и window с отрисованными строками и колонками. Слой прокручивается вместе с ячейками, липкая шапка и закреплённые колонки ложатся поверх него, а указатель он пропускает, пока элементу не задан pointer-events: auto.',
        en: 'Layer over the cells in the coordinates of the scrolled content: the slot receives rectOf(range) → { top, start, width, height } and window with the rendered rows and columns. The layer scrolls with the cells, the sticky header and pinned columns lie over it, and it lets the pointer through until an element sets pointer-events: auto.',
      },
      detail: {
        ru: 'Деталь раскрытой строки на всю ширину таблицы: слот получает строку и её позицию. Раскрытые ключи лежат в expanded; в дереве строк слот не работает.',
        en: 'Detail of an opened row across the full width of the table: the slot receives the row and its position. The opened keys live in expanded; the slot does not work in a row tree.',
      },
    },
    keyboard: [
      {
        keys: 'Enter / Space',
        description: {
          ru: 'На ячейке шапки меняет сортировку: по возрастанию, по убыванию, без сортировки.',
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
          ru: 'При включённом rowHeaders на заголовке строки выделяет строку, на заголовке колонки без сортировки — колонку, а на угловой ячейке — все ячейки.',
          en: 'With rowHeaders on, on a row header selects the row, on the header of a column that does not sort the column, and on the corner cell every cell.',
        },
      },
      {
        keys: 'Enter / Space',
        description: {
          ru: 'На строке группы или в колонке дерева разворачивает или сворачивает строку; в той же колонке открывает и закрывает деталь.',
          en: 'On a group row or in the tree column expands or collapses the row; in the same column opens and closes a detail.',
        },
      },
      {
        keys: 'Tab / Shift+Tab',
        description: {
          ru: 'На ячейке детали уводит фокус в её содержимое и возвращает обратно; клавиши внутри детали таблица не обрабатывает.',
          en: 'On a detail cell moves focus into its content and back; the table handles no keys inside a detail.',
        },
      },
      {
        keys: 'Space',
        description: {
          ru: 'При включённом selectable на ячейке строки выбирает или снимает строку; на ячейке флажка в шапке — все строки на экране.',
          en: 'With selectable on, on a row cell selects or deselects the row; on the header checkbox cell, every row in view.',
        },
      },
      {
        keys: 'Alt+ArrowLeft / Alt+ArrowRight',
        description: {
          ru: 'На ячейке шапки сужает или расширяет колонку на 10 px; в RTL стрелки меняются местами.',
          en: 'On a header cell narrows or widens the column by 10 px; in RTL the arrows swap.',
        },
      },
      {
        keys: 'Alt+ArrowUp / Alt+ArrowDown',
        description: {
          ru: 'При включённом rowHeaders.resizable на заголовке строки уменьшает или увеличивает её высоту на 8 px.',
          en: 'With rowHeaders.resizable on, on a row header lowers or raises the row by 8 px.',
        },
      },
      {
        keys: 'Alt+Shift+ArrowLeft / Alt+Shift+ArrowRight',
        description: {
          ru: 'На ячейке шапки переставляет колонку на одну позицию внутри её панели, фокус остаётся на ней; в RTL стрелки меняются местами.',
          en: 'On a header cell moves the column one position inside its pane and keeps the focus on it; in RTL the arrows swap.',
        },
      },
      {
        keys: 'Alt+Shift+ArrowUp / Alt+Shift+ArrowDown',
        description: {
          ru: 'При включённом rowDrag на ячейке строки переставляет строку среди соседей; фокус следует за строкой.',
          en: 'With rowDrag on, on a row cell moves the row among its siblings; the focus follows the row.',
        },
      },
      {
        keys: 'Alt+Shift+ArrowRight / Alt+Shift+ArrowLeft',
        description: {
          ru: 'Вкладывает строку в предыдущего соседа или выносит её следом за родителем; в RTL стрелки меняются местами.',
          en: 'Nests the row into the previous sibling or lifts it after its parent; in RTL the arrows swap.',
        },
      },
      {
        keys: 'Shift+Arrow / Shift+Home / Shift+End',
        description: {
          ru: 'Тянет свободный угол диапазона от активной ячейки; с Ctrl доходит до края данных из nextEdge или до края таблицы.',
          en: 'Drags the free corner of the range away from the active cell; with Ctrl it reaches the edge of the data from nextEdge or the edge of the table.',
        },
      },
      {
        keys: 'Shift+Space / Ctrl+Space / Ctrl+A',
        description: {
          ru: 'Выделяет строки диапазона целиком, его колонки целиком или все ячейки страницы; Escape снимает выделение.',
          en: 'Selects the whole rows of the range, its whole columns or every cell of the page; Escape clears the selection.',
        },
      },
      {
        keys: 'Ctrl+C',
        description: {
          ru: 'Копирует диапазоны или активную ячейку как текст с табуляцией и HTML-таблицу.',
          en: 'Copies the ranges or the active cell as tab separated text and an HTML table.',
        },
      },
      {
        keys: 'Enter / F2',
        description: {
          ru: 'На изменяемой ячейке открывает редактор по типу колонки, а набор текста открывает его с первым символом; булеву ячейку переключает сразу.',
          en: 'On an editable cell opens the editor of the column type, and typing opens it with the first character; a boolean cell toggles at once.',
        },
      },
      {
        keys: 'Enter / Shift+Enter',
        description: {
          ru: 'В редакторе сохраняет значение и переходит на строку ниже или выше; значение против правил остаётся в редакторе с ошибкой.',
          en: 'In the editor saves the value and moves one row down or up; a value that breaks the rules stays in the editor with its error.',
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
          ru: 'В редакторе ячейки, пока picking отвечает true, выбирают ссылку от ячейки правки или от прошлой ссылки; с Shift растягивают её.',
          en: 'In the cell editor, while picking answers true, pick a reference from the edited cell or from the last reference; with Shift they stretch it.',
        },
      },
      {
        keys: 'Ctrl+Enter',
        description: {
          ru: 'В редакторе записывает значение во все изменяемые ячейки выделения с тем же типом колонки и оставляет курсор на месте.',
          en: 'In the editor writes the value into every editable cell of the selection with the same column type and keeps the cursor in place.',
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
          ru: 'Очищает изменяемые ячейки выделения или активной ячейки.',
          en: 'Clears the editable cells of the selection or the active cell.',
        },
      },
      {
        keys: 'Ctrl+X',
        description: {
          ru: 'Копирует выделение и очищает его изменяемые ячейки.',
          en: 'Copies the selection and clears its editable cells.',
        },
      },
      {
        keys: 'Ctrl+V',
        description: {
          ru: 'Вставляет блок из буфера от активной ячейки; одно значение заполняет всё выделение.',
          en: 'Pastes a block from the clipboard at the active cell; a single value fills the whole selection.',
        },
      },
      {
        keys: 'Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y',
        description: {
          ru: 'Отменяет последнюю правку и повторяет отменённую.',
          en: 'Undoes the last edit and redoes an undone one.',
        },
      },
      {
        keys: 'Shift+F10 / ContextMenu',
        description: {
          ru: 'Открывает меню ячейки на первом пункте; Escape возвращает фокус в ячейку.',
          en: 'Opens the cell menu on its first item; Escape returns focus to the cell.',
        },
      },
      {
        keys: 'Alt+ArrowDown',
        description: {
          ru: 'На ячейке шапки открывает меню колонки на первом пункте, а без меню — фильтр; Escape закрывает их и возвращает фокус в шапку.',
          en: 'On a header cell opens the column menu on its first item, or the filter without a menu; Escape closes them and returns focus to the header.',
        },
      },
      {
        keys: 'ArrowUp / ArrowDown',
        description: {
          ru: 'Переходит на строку выше или ниже; выше первой строки лежит шапка.',
          en: 'Moves to the row above or below; the header sits above the first row.',
        },
      },
      {
        keys: 'ArrowLeft / ArrowRight',
        description: {
          ru: 'Переходит на соседнюю колонку; в RTL стрелки меняются местами.',
          en: 'Moves to the neighbouring column; in RTL the arrows swap.',
        },
      },
      {
        keys: 'Home / End',
        description: {
          ru: 'Переходит на первую или последнюю колонку строки.',
          en: 'Moves to the first or the last column of the row.',
        },
      },
      {
        keys: 'Ctrl+Arrow',
        description: {
          ru: 'Переходит к краю таблицы по направлению стрелки, а с nextEdge — к краю данных, как в электронных таблицах.',
          en: 'Moves to the edge of the table in the direction of the arrow, or with nextEdge to the edge of the data, as spreadsheets do.',
        },
      },
      {
        keys: 'Ctrl+Home / Ctrl+End',
        description: {
          ru: 'Переходит на первую ячейку данных или на последнюю ячейку, включая строку итогов.',
          en: 'Moves to the first data cell or to the last cell, the totals row included.',
        },
      },
      {
        keys: 'PageUp / PageDown',
        description: {
          ru: 'Переходит на экран строк вверх или вниз.',
          en: 'Moves a screen of rows up or down.',
        },
      },
    ],
  },
};

export default docs;
