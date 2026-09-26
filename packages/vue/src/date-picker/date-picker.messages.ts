import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiDatePickerMessages {
  readonly open: string;
  readonly openRange: string;
  readonly clear: string;
  readonly dialog: string;
  readonly end: string;
  readonly yearGlyph: string;
  readonly monthGlyph: string;
  readonly dayGlyph: string;
  readonly timeGlyphs: string;
}

export const datePickerMessages: NuiMessageCatalog<'datePicker'> = {
  namespace: 'datePicker',
  en: {
    open: 'Choose date',
    openRange: 'Choose dates',
    clear: 'Clear',
    dialog: 'Calendar',
    end: 'End date',
    yearGlyph: 'Y',
    monthGlyph: 'M',
    dayGlyph: 'D',
    timeGlyphs: 'HH:mm',
  },
  ru: {
    open: 'Выбрать дату',
    openRange: 'Выбрать период',
    clear: 'Очистить',
    dialog: 'Календарь',
    end: 'Дата окончания',
    yearGlyph: 'Г',
    monthGlyph: 'М',
    dayGlyph: 'Д',
    timeGlyphs: 'ЧЧ:ММ',
  },
};
