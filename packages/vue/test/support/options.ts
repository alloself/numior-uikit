import type { NuiOptionSource, NuiTreeItem } from '../../src';

export const FRUITS: NuiOptionSource = [
  { value: 'apple', label: 'Apple', icon: 'check' },
  { value: 'banana', label: 'Banana', description: 'Yellow' },
  { value: 'blueberry', label: 'Blueberry', disabled: true },
  {
    label: 'Citrus',
    items: [
      { value: 'lemon', label: 'Lemon' },
      { value: 'lime', label: 'Lime' },
    ],
  },
];

export const CATEGORIES: readonly NuiTreeItem[] = [
  {
    value: 'electronics',
    label: 'Electronics',
    children: [
      { value: 'phones', label: 'Phones' },
      { value: 'laptops', label: 'Laptops', description: 'Portable' },
    ],
  },
  { value: 'clothes', label: 'Clothes', children: [{ value: 'shoes', label: 'Shoes' }] },
  { value: 'books', label: 'Books' },
];
