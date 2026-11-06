import { plural, type NuiMessageCatalog } from '@numior/primitives';

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
}

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
  },
};
