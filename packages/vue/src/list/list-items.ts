import { createCollection } from '@numior/primitives';
import type { ListItemKey, ListItems } from './list-context';

export const createListItems = (): ListItems => ({
  elements: createCollection<ListItemKey>(),
  titles: new WeakMap(),
});

export const titleOf = (items: ListItems, element: HTMLElement): string =>
  items.titles.get(element)?.() ?? element.textContent ?? '';
