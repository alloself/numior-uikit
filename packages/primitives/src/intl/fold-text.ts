import { deburr } from 'lodash-es';

export const foldText = (text: string, locale?: string): string =>
  deburr(text.normalize('NFC').toLocaleLowerCase(locale)).replaceAll('ё', 'е');
