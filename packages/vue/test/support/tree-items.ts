import type { NuiTreeItem } from '../../src';

export const FILES: readonly NuiTreeItem<string>[] = [
  {
    value: 'src',
    label: 'src',
    children: [
      {
        value: 'components',
        label: 'components',
        children: [
          { value: 'button', label: 'Button.vue' },
          { value: 'input', label: 'Input.vue', disabled: true },
        ],
      },
      { value: 'index', label: 'index.ts', description: 'entry' },
    ],
  },
  { value: 'docs', label: 'docs', lazy: true },
  { value: 'readme', label: 'README.md' },
  {
    value: 'legacy',
    label: 'legacy',
    disabled: true,
    children: [{ value: 'old', label: 'old.js' }],
  },
  { value: 'empty', label: 'empty', children: [] },
  { value: 'design', label: 'Дизайн', children: [{ value: 'logo', label: 'logo.svg' }] },
];

export const withDocs = (children: readonly NuiTreeItem<string>[]): NuiTreeItem<string>[] =>
  FILES.map((item) => (item.value === 'docs' ? { ...item, children } : item));

export const manyNodes = (count: number): NuiTreeItem<string>[] =>
  Array.from({ length: count }, (_, index) => ({
    value: `n${index}`,
    label: `Узел ${index}`,
    children: [{ value: `n${index}-child`, label: `Лист ${index}` }],
  }));
