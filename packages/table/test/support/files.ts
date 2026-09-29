import type { NuiTableColumn } from '../../src';

export interface FileNode {
  readonly path: string;
  readonly name: string;
  readonly size: number | null;
  readonly items?: readonly FileNode[];
  readonly lazy?: boolean;
}

export const FILES: readonly FileNode[] = [
  {
    path: 'docs',
    name: 'docs',
    size: null,
    items: [
      { path: 'docs/plan.md', name: 'plan.md', size: 3 },
      { path: 'docs/adr.md', name: 'adr.md', size: 5 },
      {
        path: 'docs/old',
        name: 'old',
        size: null,
        items: [{ path: 'docs/old/notes.txt', name: 'notes.txt', size: 1 }],
      },
    ],
  },
  { path: 'src', name: 'src', size: null, lazy: true },
  { path: 'readme.md', name: 'readme.md', size: 2 },
];

export const FILE_COLUMNS: readonly NuiTableColumn<FileNode>[] = [
  { key: 'name', label: 'Имя', type: 'text', width: 220, value: (row) => row.name },
  { key: 'size', label: 'Размер', type: 'number', width: 100, value: (row) => row.size },
];
