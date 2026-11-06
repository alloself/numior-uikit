import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiSpreadsheetMessages {
  readonly formulaError: (params: { readonly position: number }) => string;
  readonly nameBox: string;
  readonly formulaBar: string;
  readonly expandFormula: string;
  readonly unknownName: (params: { readonly name: string }) => string;
}

export const spreadsheetMessages: NuiMessageCatalog<NuiSpreadsheetMessages> = {
  namespace: 'spreadsheet',
  en: {
    formulaError: ({ position }) => `The formula has an error at character ${String(position)}`,
    nameBox: 'Name box',
    formulaBar: 'Formula bar',
    expandFormula: 'Expand the formula bar',
    unknownName: ({ name }) => `There is no cell or name “${name}”`,
  },
  ru: {
    formulaError: ({ position }) => `Ошибка в формуле: символ ${String(position)}`,
    nameBox: 'Поле имени',
    formulaBar: 'Строка формул',
    expandFormula: 'Развернуть строку формул',
    unknownName: ({ name }) => `Нет ячейки или имени «${name}»`,
  },
};
