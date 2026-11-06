import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiSpreadsheetMessages {
  readonly formulaError: (params: { readonly position: number }) => string;
}

export const spreadsheetMessages: NuiMessageCatalog<NuiSpreadsheetMessages> = {
  namespace: 'spreadsheet',
  en: {
    formulaError: ({ position }) => `The formula has an error at character ${String(position)}`,
  },
  ru: {
    formulaError: ({ position }) => `Ошибка в формуле: символ ${String(position)}`,
  },
};
