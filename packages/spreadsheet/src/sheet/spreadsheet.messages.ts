import { plural, type NuiMessageCatalog } from '@numior/primitives';
import type { XlsxLimitationCode, XlsxRejection } from '../xlsx/read/read.types';
import type { XlsxLoss } from '../xlsx/write/write.types';

export interface NuiSpreadsheetMessages {
  readonly formulaError: (params: { readonly position: number }) => string;
  readonly nameBox: string;
  readonly formulaBar: string;
  readonly expandFormula: string;
  readonly unknownName: (params: { readonly name: string }) => string;
  readonly functions: string;
  readonly arguments: string;
  readonly sheets: string;
  readonly sheetMenu: string;
  readonly addSheet: string;
  readonly insertSheet: string;
  readonly renameSheet: string;
  readonly deleteSheet: string;
  readonly sheetName: string;
  readonly newSheet: (params: { readonly index: number }) => string;
  readonly sheetNameInvalid: string;
  readonly sheetNameTaken: string;
  readonly sheetRefused: string;
  readonly insertRowsAbove: (params: { readonly count: number }) => string;
  readonly insertRowsBelow: (params: { readonly count: number }) => string;
  readonly insertColsBefore: (params: { readonly count: number }) => string;
  readonly insertColsAfter: (params: { readonly count: number }) => string;
  readonly deleteRows: (params: { readonly count: number }) => string;
  readonly deleteCols: (params: { readonly count: number }) => string;
  readonly sheetFull: string;
  readonly recalculating: (params: { readonly share: string }) => string;
  readonly recalcStopped: string;
  readonly recalcDone: string;
  readonly stopRecalc: string;
  readonly resumeRecalc: string;
  readonly reportReadOnly: string;
  readonly reportPartial: string;
  readonly reportStale: (params: { readonly count: number }) => string;
  readonly reportRecalc: string;
  readonly reportDetails: string;
  readonly reportDismiss: string;
  readonly limitation: (params: { readonly code: XlsxLimitationCode }) => string;
  readonly fileOpen: string;
  readonly fileSave: string;
  readonly fileCancel: string;
  readonly fileEdited: string;
  readonly fileDefaultName: string;
  readonly fileReading: string;
  readonly fileSaved: (params: { readonly name: string }) => string;
  readonly fileOpened: (params: { readonly name: string }) => string;
  readonly fileRejected: (params: { readonly reason: XlsxRejection }) => string;
  readonly fileSaveFailed: string;
  readonly fileOpenFailed: string;
  readonly fileLossTitle: string;
  readonly fileLossDescription: string;
  readonly fileLossConfirm: string;
  readonly fileLoss: (loss: XlsxLoss) => string;
  readonly fileDiscardTitle: string;
  readonly fileDiscardDescription: string;
  readonly fileDiscardConfirm: string;
  readonly chart: string;
  readonly picture: string;
  readonly chartSeries: (params: { readonly index: number }) => string;
  readonly foreignDrawing: (params: { readonly label: string }) => string;
  readonly drawingSelected: (params: { readonly label: string }) => string;
  readonly drawingRemoved: (params: { readonly label: string }) => string;
  readonly insertChart: string;
  readonly insertPicture: string;
  readonly chartSettings: string;
  readonly chartSettingsClose: string;
  readonly chartKind: string;
  readonly chartTitleField: string;
  readonly chartLegend: string;
  readonly chartStacking: string;
  readonly chartStackingNone: string;
  readonly chartStackingStacked: string;
  readonly chartStackingPercent: string;
  readonly chartConnectGaps: string;
  readonly pictureRefused: string;
  readonly pictureName: (params: { index: number }) => string;
  readonly chartColumn: string;
  readonly chartBar: string;
  readonly chartLine: string;
  readonly chartArea: string;
  readonly chartPie: string;
  readonly chartDoughnut: string;
  readonly chartScatter: string;
  readonly chartNoData: string;
  readonly chartName: (params: { readonly index: number }) => string;
}

const EN_REJECTIONS: Readonly<Record<XlsxRejection, string>> = {
  'not-xlsx': 'This file is not an XLSX book',
  encrypted: 'This book is password-protected and cannot be opened',
  binary: 'XLSB books cannot be opened, save the book as XLSX',
  damaged: 'This file is damaged and cannot be opened',
};

const RU_REJECTIONS: Readonly<Record<XlsxRejection, string>> = {
  'not-xlsx': 'Этот файл не является книгой XLSX',
  encrypted: 'Книга защищена паролем, её нельзя открыть',
  binary: 'Книги XLSB не открываются, сохраните книгу как XLSX',
  damaged: 'Файл повреждён, его нельзя открыть',
};

const EN_LOSSES: Readonly<Record<XlsxLoss['reason'], (sheet: string) => string>> = {
  'moved-lines': (sheet) =>
    `${sheet}: rows or columns moved, so unsupported items tied to cells are dropped`,
  'renamed-sheet': (sheet) =>
    `${sheet}: the sheet was renamed, so unsupported items that refer to it are dropped`,
  'pivot-source': (sheet) => `${sheet}: the source of a pivot table is gone, so it becomes values`,
};

const RU_LOSSES: Readonly<Record<XlsxLoss['reason'], (sheet: string) => string>> = {
  'moved-lines': (sheet) =>
    `${sheet}: строки или колонки сдвинуты, неподдержанные элементы у ячеек будут удалены`,
  'renamed-sheet': (sheet) =>
    `${sheet}: лист переименован, неподдержанные элементы со ссылкой на него будут удалены`,
  'pivot-source': (sheet) => `${sheet}: источник сводной таблицы удалён, она станет значениями`,
};

const EN_LIMITATIONS: Readonly<Record<XlsxLimitationCode, string>> = {
  'date-1904': 'Dates in the 1904 date system',
  'external-links': 'Links to other books show the values saved in the file',
  'external-tables': 'Tables of other books show the values saved in the file',
  'linked-objects': 'Linked DDE and OLE objects',
  'pivot-tables': 'Pivot tables with unsupported features',
  'data-tables': 'What-if data tables',
  'formula-syntax': 'Formulas that could not be read',
  'unsupported-functions': 'Unsupported functions keep the values saved by Excel',
  'cell-styles': 'Part of the cell formatting',
  'rich-text': 'Formatting inside cell text',
  'merged-cells': 'Merged cells',
  'conditional-formats': 'Conditional formatting',
  'data-validation': 'Data validation',
  hyperlinks: 'Hyperlinks',
  drawings: 'Pictures and charts',
  comments: 'Comments',
  'sheet-layout': 'Part of the sheet layout',
  'hidden-sheets': 'Hidden sheets',
  protection: 'Sheet protection',
  macros: 'Macros',
  'recalc-on-load': 'The file asked to recalculate formulas on open',
  'strict-format': 'Strict Open XML',
  tables: 'Tables that could not be placed',
};

const RU_LIMITATIONS: Readonly<Record<XlsxLimitationCode, string>> = {
  'date-1904': 'Даты в системе 1904 года',
  'external-links': 'Ссылки на другие книги показывают значения, сохранённые в файле',
  'external-tables': 'Таблицы других книг показывают значения, сохранённые в файле',
  'linked-objects': 'Связанные объекты DDE и OLE',
  'pivot-tables': 'Сводные таблицы с неподдерживаемыми возможностями',
  'data-tables': 'Таблицы подстановки',
  'formula-syntax': 'Формулы, которые не удалось прочитать',
  'unsupported-functions': 'Неподдерживаемые функции хранят значения, сохранённые Excel',
  'cell-styles': 'Часть оформления ячеек',
  'rich-text': 'Оформление внутри текста ячеек',
  'merged-cells': 'Объединённые ячейки',
  'conditional-formats': 'Условное форматирование',
  'data-validation': 'Проверка данных',
  hyperlinks: 'Гиперссылки',
  drawings: 'Рисунки и диаграммы',
  comments: 'Примечания',
  'sheet-layout': 'Часть разметки листа',
  'hidden-sheets': 'Скрытые листы',
  protection: 'Защита листов',
  macros: 'Макросы',
  'recalc-on-load': 'Файл просил пересчитать формулы при открытии',
  'strict-format': 'Строгий формат Open XML',
  tables: 'Таблицы, которые не удалось разместить',
};

export const spreadsheetMessages: NuiMessageCatalog<NuiSpreadsheetMessages> = {
  namespace: 'spreadsheet',
  en: {
    formulaError: ({ position }) => `The formula has an error at character ${String(position)}`,
    nameBox: 'Name box',
    formulaBar: 'Formula bar',
    expandFormula: 'Expand the formula bar',
    unknownName: ({ name }) => `There is no cell or name “${name}”`,
    functions: 'Functions',
    arguments: 'Function arguments',
    sheets: 'Sheets',
    sheetMenu: 'Sheet actions',
    addSheet: 'Add sheet',
    insertSheet: 'Insert sheet',
    renameSheet: 'Rename',
    deleteSheet: 'Delete',
    sheetName: 'Sheet name',
    newSheet: ({ index }) => `Sheet${String(index)}`,
    sheetNameInvalid: 'Use up to 31 characters without : \\ / ? * [ ]',
    sheetNameTaken: 'This name is already taken',
    sheetRefused: 'The book needs at least one sheet',
    insertRowsAbove: ({ count }) =>
      `Insert ${String(count)} ${plural('en', count, { one: 'row', other: 'rows' })} above`,
    insertRowsBelow: ({ count }) =>
      `Insert ${String(count)} ${plural('en', count, { one: 'row', other: 'rows' })} below`,
    insertColsBefore: ({ count }) =>
      `Insert ${String(count)} ${plural('en', count, { one: 'column', other: 'columns' })} left`,
    insertColsAfter: ({ count }) =>
      `Insert ${String(count)} ${plural('en', count, { one: 'column', other: 'columns' })} right`,
    deleteRows: ({ count }) =>
      `Delete ${String(count)} ${plural('en', count, { one: 'row', other: 'rows' })}`,
    deleteCols: ({ count }) =>
      `Delete ${String(count)} ${plural('en', count, { one: 'column', other: 'columns' })}`,
    sheetFull: 'Cannot insert: the last rows or columns of the sheet hold data',
    recalculating: ({ share }) => `Recalculating ${share}`,
    recalcStopped: 'Recalculation stopped',
    recalcDone: 'Recalculation finished',
    stopRecalc: 'Stop',
    resumeRecalc: 'Continue',
    reportReadOnly: 'The book is open read-only',
    reportPartial: 'Some parts of the book are not fully supported',
    reportStale: ({ count }) =>
      `${String(count)} ${plural('en', count, { one: 'formula shows its value', other: 'formulas show their values' })} saved in the file`,
    reportRecalc: 'Recalculate',
    reportDetails: 'Details',
    reportDismiss: 'Hide',
    limitation: ({ code }) => EN_LIMITATIONS[code],
    fileOpen: 'Open',
    fileSave: 'Save',
    fileCancel: 'Cancel',
    fileEdited: 'Edited',
    fileDefaultName: 'Book',
    fileReading: 'Opening the file',
    fileSaved: ({ name }) => `Saved ${name}`,
    fileOpened: ({ name }) => `Opened ${name}`,
    fileRejected: ({ reason }) => EN_REJECTIONS[reason],
    fileSaveFailed: 'The book could not be saved',
    fileOpenFailed: 'The file could not be opened',
    fileLossTitle: 'Save with losses?',
    fileLossDescription: 'Some parts of the original file cannot be kept after these edits.',
    fileLossConfirm: 'Save anyway',
    fileLoss: ({ sheet, reason }) => EN_LOSSES[reason](sheet),
    fileDiscardTitle: 'Discard unsaved edits?',
    fileDiscardDescription: 'Opening another file replaces this book and its unsaved edits.',
    fileDiscardConfirm: 'Open the file',
    chart: 'Chart',
    picture: 'Picture',
    chartSeries: ({ index }) => `Series ${String(index)}`,
    foreignDrawing: ({ label }) => `This object is not supported yet: ${label}`,
    drawingSelected: ({ label }) =>
      `${label} selected. Arrows move it, Delete removes it, Tab goes to the next object, Escape returns to the cells`,
    drawingRemoved: ({ label }) => `${label} removed`,
    insertChart: 'Insert chart',
    insertPicture: 'Insert picture…',
    chartSettings: 'Chart settings',
    chartSettingsClose: 'Close chart settings',
    chartKind: 'Chart type',
    chartTitleField: 'Title',
    chartLegend: 'Legend',
    chartStacking: 'Stacking',
    chartStackingNone: 'None',
    chartStackingStacked: 'Stacked',
    chartStackingPercent: 'Stacked to 100%',
    chartConnectGaps: 'Connect gaps in the data',
    pictureRefused: 'This file cannot be inserted as a picture: use PNG, JPEG, GIF or BMP',
    pictureName: ({ index }) => `Picture ${String(index)}`,
    chartColumn: 'Column',
    chartBar: 'Bar',
    chartLine: 'Line',
    chartArea: 'Area',
    chartPie: 'Pie',
    chartDoughnut: 'Doughnut',
    chartScatter: 'Scatter',
    chartNoData: 'Select cells with numbers to build a chart',
    chartName: ({ index }) => `Chart ${String(index)}`,
  },
  ru: {
    formulaError: ({ position }) => `Ошибка в формуле: символ ${String(position)}`,
    nameBox: 'Поле имени',
    formulaBar: 'Строка формул',
    expandFormula: 'Развернуть строку формул',
    unknownName: ({ name }) => `Нет ячейки или имени «${name}»`,
    functions: 'Функции',
    arguments: 'Аргументы функции',
    sheets: 'Листы',
    sheetMenu: 'Действия с листом',
    addSheet: 'Добавить лист',
    insertSheet: 'Вставить лист',
    renameSheet: 'Переименовать',
    deleteSheet: 'Удалить',
    sheetName: 'Имя листа',
    newSheet: ({ index }) => `Лист${String(index)}`,
    sheetNameInvalid: 'До 31 символа, без : \\ / ? * [ ]',
    sheetNameTaken: 'Это имя уже занято',
    sheetRefused: 'В книге должен остаться хотя бы один лист',
    insertRowsAbove: ({ count }) =>
      `Вставить ${String(count)} ${plural('ru', count, { one: 'строку', few: 'строки', many: 'строк', other: 'строки' })} выше`,
    insertRowsBelow: ({ count }) =>
      `Вставить ${String(count)} ${plural('ru', count, { one: 'строку', few: 'строки', many: 'строк', other: 'строки' })} ниже`,
    insertColsBefore: ({ count }) =>
      `Вставить ${String(count)} ${plural('ru', count, { one: 'столбец', few: 'столбца', many: 'столбцов', other: 'столбца' })} слева`,
    insertColsAfter: ({ count }) =>
      `Вставить ${String(count)} ${plural('ru', count, { one: 'столбец', few: 'столбца', many: 'столбцов', other: 'столбца' })} справа`,
    deleteRows: ({ count }) =>
      `Удалить ${String(count)} ${plural('ru', count, { one: 'строку', few: 'строки', many: 'строк', other: 'строки' })}`,
    deleteCols: ({ count }) =>
      `Удалить ${String(count)} ${plural('ru', count, { one: 'столбец', few: 'столбца', many: 'столбцов', other: 'столбца' })}`,
    sheetFull: 'Нельзя вставить: в последних строках или столбцах листа есть данные',
    recalculating: ({ share }) => `Пересчёт ${share}`,
    recalcStopped: 'Пересчёт остановлен',
    recalcDone: 'Пересчёт завершён',
    stopRecalc: 'Остановить',
    resumeRecalc: 'Продолжить',
    reportReadOnly: 'Книга открыта только для чтения',
    reportPartial: 'Часть книги поддерживается не полностью',
    reportStale: ({ count }) =>
      `${String(count)} ${plural('ru', count, { one: 'формула показывает значение, сохранённое', few: 'формулы показывают значения, сохранённые', many: 'формул показывают значения, сохранённые', other: 'формулы показывают значения, сохранённые' })} в файле`,
    reportRecalc: 'Пересчитать',
    reportDetails: 'Подробнее',
    reportDismiss: 'Скрыть',
    limitation: ({ code }) => RU_LIMITATIONS[code],
    fileOpen: 'Открыть',
    fileSave: 'Сохранить',
    fileCancel: 'Отмена',
    fileEdited: 'Изменено',
    fileDefaultName: 'Книга',
    fileReading: 'Файл открывается',
    fileSaved: ({ name }) => `Файл ${name} сохранён`,
    fileOpened: ({ name }) => `Файл ${name} открыт`,
    fileRejected: ({ reason }) => RU_REJECTIONS[reason],
    fileSaveFailed: 'Книгу не удалось сохранить',
    fileOpenFailed: 'Файл не удалось открыть',
    fileLossTitle: 'Сохранить с потерями?',
    fileLossDescription: 'После этих правок часть исходного файла не сохранится.',
    fileLossConfirm: 'Всё равно сохранить',
    fileLoss: ({ sheet, reason }) => RU_LOSSES[reason](sheet),
    fileDiscardTitle: 'Отменить несохранённые правки?',
    fileDiscardDescription: 'Другой файл заменит эту книгу вместе с несохранёнными правками.',
    fileDiscardConfirm: 'Открыть файл',
    chart: 'Диаграмма',
    picture: 'Рисунок',
    chartSeries: ({ index }) => `Ряд ${String(index)}`,
    foreignDrawing: ({ label }) => `Этот объект пока не поддерживается: ${label}`,
    drawingSelected: ({ label }) =>
      `Выбран объект: ${label}. Стрелки двигают, Delete удаляет, Tab — следующий объект, Escape — назад к ячейкам`,
    drawingRemoved: ({ label }) => `Объект удалён: ${label}`,
    insertChart: 'Вставить диаграмму',
    insertPicture: 'Вставить картинку…',
    chartSettings: 'Настройки диаграммы',
    chartSettingsClose: 'Закрыть настройки диаграммы',
    chartKind: 'Тип диаграммы',
    chartTitleField: 'Заголовок',
    chartLegend: 'Легенда',
    chartStacking: 'Накопление',
    chartStackingNone: 'Нет',
    chartStackingStacked: 'С накоплением',
    chartStackingPercent: 'С накоплением до 100%',
    chartConnectGaps: 'Соединять пропуски в данных',
    pictureRefused: 'Этот файл нельзя вставить как картинку: подойдут PNG, JPEG, GIF и BMP',
    pictureName: ({ index }) => `Рисунок ${String(index)}`,
    chartColumn: 'Гистограмма',
    chartBar: 'Линейчатая',
    chartLine: 'График',
    chartArea: 'С областями',
    chartPie: 'Круговая',
    chartDoughnut: 'Кольцевая',
    chartScatter: 'Точечная',
    chartNoData: 'Выделите ячейки с числами, чтобы построить диаграмму',
    chartName: ({ index }) => `Диаграмма ${String(index)}`,
  },
};
