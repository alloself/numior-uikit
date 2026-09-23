import type { NuiOptionSource } from '../../src';

export const FRUITS: NuiOptionSource<string> = [
  { value: 'apple', label: 'Apple', icon: 'check' },
  { value: 'banana', label: 'Banana', description: 'Yellow' },
  { value: 'blueberry', label: 'Blueberry', disabled: true },
  {
    label: 'Citrus',
    options: [
      { value: 'lemon', label: 'Lemon' },
      { value: 'lime', label: 'Lime' },
    ],
  },
];
