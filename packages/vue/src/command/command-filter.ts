import { foldText } from '@numior/primitives';
import type { NuiCommandItem } from './command.types';

const normalize = (text: string): string => foldText(text.trim());

export const defaultCommandFilter = <T>(item: NuiCommandItem<T>, query: string): boolean => {
  const needle = normalize(query);

  if (needle === '') {
    return true;
  }
  const haystack = [item.label, item.description ?? '', ...(item.keywords ?? [])];

  return haystack.some((text) => normalize(text).includes(needle));
};
