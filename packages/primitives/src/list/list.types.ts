export type ListOrientation = (typeof ListOrientation)[keyof typeof ListOrientation];

export type ListMove = (typeof ListMove)[keyof typeof ListMove];

export type ListFocusMode = (typeof ListFocusMode)[keyof typeof ListFocusMode];

export const ListOrientation = {
  Vertical: 'vertical',
  Horizontal: 'horizontal',
  Both: 'both',
} as const;

export const ListMove = {
  First: 'first',
  Last: 'last',
  Next: 'next',
  Prev: 'prev',
  PageNext: 'page-next',
  PagePrev: 'page-prev',
} as const;

export const ListFocusMode = { Roving: 'roving', Virtual: 'virtual' } as const;
