export type PopoverMode = (typeof PopoverMode)[keyof typeof PopoverMode];

export const PopoverMode = { Auto: 'auto', Manual: 'manual' } as const;

export const PopoverState = { Open: 'open', Closed: 'closed' } as const;
