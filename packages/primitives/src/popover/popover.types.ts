export type PopoverMode = (typeof PopoverMode)[keyof typeof PopoverMode];

export type PopoverState = (typeof PopoverState)[keyof typeof PopoverState];

export const PopoverMode = { Auto: 'auto', Manual: 'manual' } as const;

export const PopoverState = { Open: 'open', Closed: 'closed' } as const;
