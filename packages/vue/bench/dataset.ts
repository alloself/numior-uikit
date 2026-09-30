import type { NuiTreeItem } from '../src/tree/tree.types';

export const generateTreeNodes = (count: number): NuiTreeItem<string>[] =>
  Array.from({ length: count }, (_, index) => ({
    value: `n${index}`,
    label: `Узел ${index + 1}`,
    children: [{ value: `n${index}-leaf`, label: `Лист ${index + 1}` }],
  }));
