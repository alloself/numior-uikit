export type ReorderAxis = (typeof ReorderAxis)[keyof typeof ReorderAxis];

export type ReorderPhase = (typeof ReorderPhase)[keyof typeof ReorderPhase];

export type ReorderEventType = (typeof ReorderEventType)[keyof typeof ReorderEventType];

export const ReorderAxis = { X: 'x', Y: 'y' } as const;

export const ReorderPhase = {
  Idle: 'idle',
  Pending: 'pending',
  Dragging: 'dragging',
  Keyboard: 'keyboard',
} as const;

export const ReorderEventType = {
  Grabbed: 'grabbed',
  Moved: 'moved',
  Dropped: 'dropped',
  Cancelled: 'cancelled',
} as const;
